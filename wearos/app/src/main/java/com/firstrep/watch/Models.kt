package com.firstrep.watch

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import java.util.UUID

val wire = Json { ignoreUnknownKeys = true; encodeDefaults = true }
@Serializable data class SetLog(val reps: String = "", val load: String = "", val done: Boolean = false)
@Serializable data class Exercise(val id: String, val label: String, val guideId: String? = null)
@Serializable data class Slot(val id: String, val label: String, val reps: String, val unit: String = "reps", val option: Exercise? = null, val learning: Boolean = false, val skipped: Boolean = false, val logs: List<SetLog> = emptyList())
@Serializable data class Session(val id: String, val title: String, val revision: Int, val status: String = "active", val slots: List<Slot>)
@Serializable data class NextWorkout(val title: String = "", val slots: List<Slot> = emptyList())
@Serializable data class Previous(val reps: String = "", val load: String = "")
@Serializable data class Snapshot(val protocol: Int = 1, val planName: String = "", val settingsRevision: Int = 0, val active: Session? = null, val next: NextWorkout = NextWorkout(), val previous: Map<String, Previous> = emptyMap())
@Serializable data class Operation(val operationId: String = UUID.randomUUID().toString(), val command: JsonObject)
@Serializable data class Undo(val sessionId: String, val slotId: String, val index: Int, val log: SetLog, val revision: Int)
@Serializable data class Journal(
    val token: String = "", val code: String = "", val approved: Boolean = false,
    val snapshot: Snapshot? = null, val pending: List<Operation> = emptyList(),
    val blocked: String = "", val restUntil: Long = 0, val undo: Undo? = null,
    val archived: List<Operation> = emptyList()
)
fun currentSet(s: Session?): Pair<Slot, Int>? = s?.slots?.firstOrNull { !it.skipped && it.option != null && it.logs.any { l -> !l.done } }?.let { it to it.logs.indexOfFirst { l -> !l.done } }
fun command(type: String, session: Session, build: JsonObjectBuilder.() -> Unit = {}): JsonObject = buildJsonObject {
    put("type", type); put("id", session.id); put("revision", session.revision); build()
}
fun applyCommand(snapshot: Snapshot, c: JsonObject): Snapshot {
    val session = snapshot.active ?: error("No active workout")
    require(c["id"]?.jsonPrimitive?.content == session.id && c["revision"]?.jsonPrimitive?.int == session.revision) { "Workout changed" }
    val type = c.getValue("type").jsonPrimitive.content
    if (type == "finish") return snapshot.copy(active = null)
    require(type == "set" || type == "skip")
    val id = c.getValue("slotId").jsonPrimitive.content
    require(session.slots.any { it.id == id })
    val slots = session.slots.map { slot ->
        if (slot.id != id) slot else if (type == "skip") slot.copy(skipped = c.getValue("skipped").jsonPrimitive.boolean)
        else {
            val index = c.getValue("index").jsonPrimitive.int
            val log = wire.decodeFromJsonElement<SetLog>(c.getValue("log"))
            require(!slot.skipped && slot.option != null && index in slot.logs.indices)
            require(!log.done || (log.reps.toDoubleOrNull()?.let { it > 0 && it <= 1000 } == true))
            slot.copy(logs = slot.logs.mapIndexed { i, old -> if (i == index) log else old })
        }
    }
    return snapshot.copy(active = session.copy(revision = session.revision + 1, slots = slots))
}
// Keep later optimistic entries until the whole queue has been acknowledged.
fun acknowledge(j: Journal, id: String, server: Snapshot): Journal {
    require(j.pending.firstOrNull()?.operationId == id)
    val remaining = j.pending.drop(1)
    return j.copy(pending = remaining, snapshot = if (remaining.isEmpty()) server else j.snapshot)
}
fun formatNumber(n: Double): String = if (n == n.toLong().toDouble()) n.toLong().toString() else String.format(java.util.Locale.US, "%.2f", n).trimEnd('0').trimEnd('.')
