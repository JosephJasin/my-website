package com.firstrep.watch

import android.app.Application
import android.os.Build
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class FirstRepApp : Application() { val repository by lazy { Repository(this) } }
class ApiFailure(val status: Int, message: String) : Exception(message)
data class UiState(val journal: Journal = Journal(), val busy: Boolean = false, val message: String = "", val storageFailed: Boolean = false)
class Repository(context: Application) {
    private val storage = Storage(context)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val syncMutex = Mutex()
    private val _state = MutableStateFlow(try { UiState(storage.load()) } catch (_: Exception) { UiState(message = "Saved watch data could not be unlocked. Do not clear app data if you have unsynced sets.", storageFailed = true) })
    val state = _state.asStateFlow()
    private fun save(j: Journal) { storage.save(j); _state.value = _state.value.copy(journal = j) }
    private fun task(block: suspend () -> Unit) { scope.launch { try { if (!_state.value.storageFailed) block() } catch (e: Exception) { _state.value = _state.value.copy(message = e.message ?: "Please retry") } } }
    private suspend fun api(path: String, method: String = "GET", payload: String? = null, token: String = _state.value.journal.token): String = withContext(Dispatchers.IO) {
        val connection = URL("https://josephjasin.com/firstrep-watch-api/$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method; connection.instanceFollowRedirects = false
            connection.connectTimeout = 12_000; connection.readTimeout = 15_000
            connection.setRequestProperty("Accept", "application/json")
            if (token.isNotEmpty()) connection.setRequestProperty("Authorization", "Bearer $token")
            if (payload != null) { connection.setRequestProperty("Content-Type", "application/json"); connection.doOutput = true; connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            val text = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val error = runCatching { wire.parseToJsonElement(text).jsonObject["error"]?.jsonPrimitive?.content }.getOrNull()
                // Edge login/challenge pages are connection failures, not rejected set commands.
                // Keep the queue retryable instead of treating a Cloudflare block as a conflict.
                if (error == null) throw ApiFailure(503, if (status in listOf(301, 302, 303, 307, 308, 403)) "Cloudflare is blocking the watch connection. Check the native API path in your site settings. Your entries stay saved." else "Connection unavailable ($status). Retry when connected.")
                throw ApiFailure(status, error)
            }
            text
        } finally { connection.disconnect() }
    }
    fun pair() = task {
        if (_state.value.busy || _state.value.journal.pending.isNotEmpty()) return@task
        _state.value = _state.value.copy(busy = true, message = "")
        try {
            val result = wire.parseToJsonElement(api("pair", "POST", buildJsonObject { put("name", Build.MODEL.take(60)) }.toString(), "")).jsonObject
            val old = _state.value.journal
            save(Journal(token = result.getValue("token").jsonPrimitive.content, code = result.getValue("code").jsonPrimitive.content, archived = old.archived))
        } finally { _state.value = _state.value.copy(busy = false) }
    }
    fun refresh() = task { sync() }
    suspend fun sync() {
        if (!syncMutex.tryLock()) return
        try {
            var j = _state.value.journal
            if (_state.value.storageFailed || j.token.isEmpty() || j.blocked.isNotEmpty()) return
            _state.value = _state.value.copy(busy = true)
            if (!j.approved) {
                val pair = wire.parseToJsonElement(api("pair")).jsonObject
                if (pair.getValue("approved").jsonPrimitive.boolean) save(j.copy(approved = true, code = "")) else return
            }
            while (_state.value.journal.pending.isNotEmpty()) {
                j = _state.value.journal
                val op = j.pending.first()
                val response = wire.decodeFromString<Snapshot>(api("command", "POST", buildJsonObject { put("operationId", op.operationId); put("command", op.command) }.toString()))
                save(acknowledge(_state.value.journal, op.operationId, response))
            }
            val response = wire.decodeFromString<Snapshot>(api("workout"))
            check(response.protocol == 1) { "Please update the watch app." }
            // UI can enqueue an entry while a GET is in flight. Never replace those local entries.
            val latest = _state.value.journal
            if (latest.pending.isEmpty()) save(latest.copy(snapshot = response, restUntil = if (response.active != null && response.active.id == latest.snapshot?.active?.id) latest.restUntil else 0, undo = latest.undo?.takeIf { it.sessionId == response.active?.id && it.revision == response.active?.revision }))
            _state.value = _state.value.copy(message = "")
        } catch (e: ApiFailure) {
            val j = _state.value.journal
            if (e.status in listOf(400, 401, 403, 404, 409)) save(j.copy(blocked = e.message ?: "Review pending entries"))
            _state.value = _state.value.copy(message = e.message ?: "Sync paused")
        } catch (_: Exception) {
            _state.value = _state.value.copy(message = "Offline · entries stay on this watch. Retry when connected.")
        } finally { _state.value = _state.value.copy(busy = false); syncMutex.unlock() }
    }
    fun start() = task {
        val j = _state.value.journal; val s = j.snapshot ?: return@task
        if (j.pending.isNotEmpty() || j.blocked.isNotEmpty() || s.active != null || _state.value.busy) return@task
        save(j.copy(pending = listOf(Operation(command = buildJsonObject { put("type", "start"); put("id", UUID.randomUUID().toString()); put("settingsRevision", s.settingsRevision) }))))
        sync()
    }
    private fun enqueue(c: JsonObject, rest: Long, undo: Undo?) {
        val j = _state.value.journal
        check(j.blocked.isEmpty()) { "Resolve the sync issue first." }
        check(j.pending.size < 200) { "Sync your pending entries before logging more." }
        val s = j.snapshot ?: error("Load the workout first")
        save(j.copy(snapshot = applyCommand(s, c), pending = j.pending + Operation(command = c, label = s.active?.slots?.find { it.id == c["slotId"]?.jsonPrimitive?.content }?.option?.label ?: s.active?.title.orEmpty(), unit = s.active?.slots?.find { it.id == c["slotId"]?.jsonPrimitive?.content }?.unit ?: "reps"), restUntil = rest, undo = undo))
        task { sync() }
    }
    fun log(reps: Int, load: String) = task {
        val j = _state.value.journal; if (j.restUntil > System.currentTimeMillis()) return@task
        val s = j.snapshot?.active ?: return@task; val (slot, index) = currentSet(s) ?: return@task
        val c = command("set", s) { put("slotId", slot.id); put("index", index); put("log", wire.encodeToJsonElement(SetLog(reps.toString(), load, true))) }
        val remaining = currentSet(applyCommand(j.snapshot!!, c).active) != null
        enqueue(c, if (remaining) System.currentTimeMillis() + 90_000 else 0, Undo(s.id, slot.id, index, slot.logs[index], s.revision + 1))
    }
    fun skip() = task {
        val s = _state.value.journal.snapshot?.active ?: return@task; val slot = currentSet(s)?.first ?: return@task
        enqueue(command("skip", s) { put("slotId", slot.id); put("skipped", true) }, 0, null)
    }
    fun undo() = task {
        val j = _state.value.journal; val u = j.undo ?: return@task; val s = j.snapshot?.active ?: return@task
        require(s.id == u.sessionId && s.revision == u.revision) { "The last set changed on another device. Review it on the website." }
        enqueue(command("set", s) { put("slotId", u.slotId); put("index", u.index); put("log", wire.encodeToJsonElement(u.log)) }, 0, null)
    }
    fun finish() = task {
        val s = _state.value.journal.snapshot?.active ?: return@task
        enqueue(command("finish", s) { if (s.slots.none { slot -> slot.logs.any { it.done } }) put("abandon", true) }, 0, null)
    }
    fun rest(delta: Long) = task { val j = _state.value.journal; save(j.copy(restUntil = if (delta == 0L) 0 else maxOf(System.currentTimeMillis(), j.restUntil) + delta)) }
    fun restCompleted(): Boolean {
        val j = _state.value.journal
        if (j.restUntil == 0L || j.restUntil > System.currentTimeMillis()) return false
        return try { save(j.copy(restUntil = 0)); true } catch (_: Exception) { false }
    }
    // Recovery never silently discards entries. They remain readable in a local archive.
    fun useServer() = task {
        syncMutex.withLock {
            val response = wire.decodeFromString<Snapshot>(api("workout"))
            val j = _state.value.journal
            save(j.copy(snapshot = response, pending = emptyList(), archived = j.archived + j.pending, blocked = "", restUntil = 0, undo = null))
            _state.value = _state.value.copy(message = "Previous pending entries are kept in Saved entries. Compare them with the website before logging them again.")
        }
    }
    fun rePair() = task {
        if (_state.value.busy) return@task
        val j = _state.value.journal
        save(Journal(archived = j.archived + j.pending))
        pair()
    }
}
