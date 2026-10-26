package com.firstrep.watch

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.TransformingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberTransformingLazyColumnState
import androidx.wear.compose.material3.*
import kotlinx.coroutines.delay
import kotlinx.serialization.json.*
import kotlin.math.abs

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 11)
        val repo = (application as FirstRepApp).repository
        setContent {
            val ui by repo.state.collectAsStateWithLifecycle()
            LaunchedEffect(Unit) { while (true) { repo.refresh(); delay(15_000) } }
            LaunchedEffect(ui.journal.snapshot?.active?.id, ui.journal.pending.isNotEmpty()) {
                if (ui.journal.snapshot?.active != null || ui.journal.pending.isNotEmpty()) startForegroundService(Intent(this@MainActivity, WorkoutService::class.java))
            }
            MaterialTheme(colorScheme = ColorScheme(primary = Color(0xFFC3EE74), onPrimary = Color(0xFF17210F), background = Color.Black, onBackground = Color(0xFFF3F5EB))) {
                AppScaffold { WatchApp(ui, repo) }
            }
        }
    }
}
@Composable private fun Copy(text: String, accent: Boolean = false) {
    Text(text, modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp), color = if (accent) Color(0xFFC3EE74) else Color(0xFFDDDFD8), fontSize = 14.sp, textAlign = TextAlign.Center)
}
@Composable private fun Action(label: String, enabled: Boolean = true, secondary: Boolean = false, action: () -> Unit) {
    Button(onClick = action, enabled = enabled, modifier = Modifier.fillMaxWidth(), colors = if (secondary) ButtonDefaults.filledTonalButtonColors() else ButtonDefaults.buttonColors()) { Text(label, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
}
@Composable private fun WatchList(listKey: String, content: androidx.wear.compose.foundation.lazy.TransformingLazyColumnScope.() -> Unit) {
    key(listKey) {
        val state = rememberTransformingLazyColumnState()
        ScreenScaffold(scrollState = state, contentPadding = PaddingValues(horizontal = 18.dp, vertical = 32.dp)) { padding ->
            TransformingLazyColumn(state = state, contentPadding = padding, verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxSize(), content = content)
        }
    }
}
@Composable private fun WatchApp(ui: UiState, repo: Repository) {
    val j = ui.journal
    var screen by rememberSaveable { mutableStateOf("workout") }
    var picker by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(500) } }
    val session = j.snapshot?.active
    val current = currentSet(session)
    val slot = current?.first
    val index = current?.second ?: 0
    val previous = slot?.option?.let { j.snapshot?.previous?.get(it.guideId ?: it.id) }
    val setKey = "${session?.id}:${slot?.id}:$index"
    var reps by rememberSaveable(setKey) { mutableIntStateOf(previous?.reps?.toDoubleOrNull()?.toInt()?.coerceIn(1, 1000) ?: Regex("\\d+").find(slot?.reps.orEmpty())?.value?.toIntOrNull()?.coerceIn(1, 1000) ?: 10) }
    var load by rememberSaveable(setKey) { mutableStateOf(previous?.load.orEmpty()) }
    var loadValue by rememberSaveable(setKey) { mutableDoubleStateOf(Regex("^\\d+(?:\\.\\d+)?").find(load)?.value?.toDoubleOrNull() ?: 0.0) }
    var unit by rememberSaveable(setKey) { mutableStateOf(when { load.contains("lb", true) -> "lb"; load.contains("each", true) -> "kg each"; load.contains("level", true) -> "level"; else -> "kg" }) }
    val editable = j.blocked.isEmpty() && !ui.storageFailed
    BackHandler(picker.isNotEmpty() || screen != "workout" || confirm.isNotEmpty()) { picker = ""; screen = "workout"; confirm = "" }
    if (picker.isNotEmpty()) {
        val isReps = picker == "reps"
        NumberPicker(if (isReps) slot?.unit ?: "reps" else unit, if (isReps) reps.toDouble() else loadValue, if (isReps || unit == "level") 1.0 else 0.5, if (isReps) 1.0 else 0.0, if (isReps) 1000.0 else 2000.0,
            change = { if (isReps) reps = it.toInt() else { loadValue = it; load = "${formatNumber(it)} $unit" } }, done = { if (!isReps) load = "${formatNumber(loadValue)} $unit"; picker = "" })
        return
    }
    if (confirm.isNotEmpty()) {
        WatchList("confirm-$confirm") {
            item { Copy(when (confirm) { "finish" -> if (session?.slots?.any { s -> s.logs.any { it.done } } == true) "Finish and save this workout?" else "Discard this empty workout?"; "skip" -> "Skip the remaining sets for this exercise? Logged sets stay saved."; "server" -> "Keep pending entries in Saved entries, then use the website's latest workout?"; else -> "Pair again? Pending entries stay in Saved entries for manual review." }) }
            item { Action("Confirm") { when (confirm) { "finish" -> repo.finish(); "skip" -> repo.skip(); "server" -> repo.useServer(); "pair" -> repo.rePair() }; confirm = "" } }
            item { Action("Cancel", secondary = true) { confirm = "" } }
        }; return
    }
    if (screen == "saved") {
        WatchList("saved") {
            item { Copy("Saved entries", true) }
            item { Copy("These are local recovery records. Check the website before re-entering them; some may already be saved there.") }
            val entries = j.archived + j.pending
            if (entries.isEmpty()) item { Copy("No pending or archived entries.") }
            entries.forEach { op -> item { Copy(describe(op)) } }
            item { Action("Back") { screen = "workout" } }
        }; return
    }
    if (ui.storageFailed) { WatchList("storage") { item { Copy(ui.message) } }; return }
    if (j.blocked.isNotEmpty()) {
        WatchList("blocked") {
            item { Copy("Sync needs attention", true) }
            item { Copy(j.blocked) }
            item { Copy("${j.pending.size} pending entries are kept on this watch.") }
            item { Action("Review entries", secondary = true) { screen = "saved" } }
            item { Action("Use website version", !ui.busy) { confirm = "server" } }
            item { Action("Pair again", !ui.busy, true) { confirm = "pair" } }
            if (ui.message != j.blocked) item { Copy(ui.message) }
        }; return
    }
    if (!j.approved) {
        WatchList("pairing") {
            item { Copy("firstrep. β", true) }
            if (j.code.isNotEmpty()) {
                item { Text(j.code.chunked(4).joinToString(" "), modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center, fontSize = 24.sp, color = Color(0xFFC3EE74)) }
                item { Copy("On your phone or PC: open josephjasin.com/firstrep → Settings → First Rep on your watch. Approve this code within 10 minutes.") }
                item { Action(if (ui.busy) "Checking…" else "I've approved it", !ui.busy) { repo.refresh() } }
                item { Action("Get new code", !ui.busy, true) { repo.pair() } }
            } else {
                item { Copy("Your workout, one set at a time. Pair once with your private First Rep account.") }
                item { Action(if (ui.busy) "Connecting…" else "Pair watch", !ui.busy) { repo.pair() } }
            }
            if (ui.message.isNotEmpty()) item { Copy(ui.message) }
            if (j.archived.isNotEmpty()) item { Action("Saved entries", secondary = true) { screen = "saved" } }
        }; return
    }
    if (j.restUntil > now && session != null) {
        WatchList("rest") {
            item { Copy("Rest", true) }
            item { Text("${((j.restUntil - now + 999) / 1000) / 60}:${(((j.restUntil - now + 999) / 1000) % 60).toString().padStart(2, '0')}", modifier = Modifier.fillMaxWidth(), fontSize = 40.sp, textAlign = TextAlign.Center) }
            item { Copy(if (slot == null) "All planned sets complete" else "Next: ${slot.option?.label} · set ${index + 1}/${slot.logs.size}") }
            item { Action("Ready · skip rest") { repo.rest(0) } }
            item { Action("+30 seconds", secondary = true) { repo.rest(30_000) } }
            if (j.undo != null) item { Action("Undo last set", secondary = true, enabled = editable) { repo.undo() } }
            item { Copy(if (j.pending.isEmpty()) "Synced" else "${j.pending.size} waiting to sync") }
            if (ui.message.isNotEmpty()) item { Copy(ui.message) }
        }; return
    }
    if (screen == "load") {
        WatchList("load") {
            item { Copy("Weight / resistance", true) }
            item { Copy("${slot?.option?.label}\nCurrent: ${load.ifEmpty { "Not recorded" }}") }
            for (u in listOf("kg", "kg each", "lb", "level")) item { Action(u, secondary = true) { unit = u; picker = "load" } }
            item { Action("Bodyweight", secondary = true) { load = "Bodyweight"; screen = "workout" } }
            item { Action("Leave weight blank", secondary = true) { load = ""; screen = "workout" } }
            item { Action("Done") { screen = "workout" } }
        }; return
    }
    WatchList(if (session == null) "home" else setKey) {
        if (session == null) {
            item { Copy("firstrep. β", true) }
            item { Copy(j.snapshot?.planName ?: "Loading your plan…") }
            if (j.snapshot != null) {
                item { Copy(j.snapshot.next.title) }
                val count = j.snapshot.next.slots.count { !it.skipped && it.option != null }
                item { Copy("$count exercises ready. Choose plans, variants and confirmed equipment on the website.") }
                item { Action(if (j.pending.isEmpty()) "Start workout" else "Waiting to sync…", editable && !ui.busy && j.pending.isEmpty() && count > 0) { repo.start() } }
            }
        } else if (slot != null) {
            item { Copy(slot.option?.label ?: slot.label, true) }
            item { Copy("Set ${index + 1}/${slot.logs.size} · target ${slot.reps} ${slot.unit}") }
            if (slot.learning) item { Copy("New exercise: one light practice set. Review its guide on your phone first.") }
            item { Action("$reps ${slot.unit}", editable, true) { picker = "reps" } }
            item { Action(load.ifEmpty { "Add weight (optional)" }, editable, true) { screen = "load" } }
            item { Action("Log $reps ${slot.unit}", editable) { repo.log(reps, load) } }
            item { Action("Skip exercise", editable, true) { confirm = "skip" } }
        } else { item { Copy("Planned sets complete", true) }; item { Copy("Finish to save this session and prepare your next workout.") } }
        if (session != null) {
            if (j.undo != null) item { Action("Undo last set", editable, true) { repo.undo() } }
            item { Action("Finish workout", editable, slot != null) { confirm = "finish" } }
        }
        item { Copy(if (j.pending.isEmpty()) if (ui.busy) "Connecting…" else "Synced" else "${j.pending.size} waiting to sync") }
        if (ui.message.isNotEmpty()) item { Copy(ui.message) }
        item { Action("Refresh / sync", !ui.busy, true) { repo.refresh() } }
        if (j.archived.isNotEmpty() || j.pending.isNotEmpty()) item { Action("Saved entries", secondary = true) { screen = "saved" } }
    }
}
@Composable private fun NumberPicker(label: String, value: Double, step: Double, min: Double, max: Double, change: (Double) -> Unit, done: () -> Unit) {
    val focus = remember { FocusRequester() }; val haptic = LocalHapticFeedback.current
    var accumulated by remember { mutableFloatStateOf(0f) }
    val latest by rememberUpdatedState(value)
    fun adjust(direction: Int) { val next = (latest + step * direction).coerceIn(min, max); if (next != latest) { change(next); haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) } }
    LaunchedEffect(Unit) { focus.requestFocus() }
    Column(modifier = Modifier.fillMaxSize().background(Color.Black).padding(horizontal = 30.dp, vertical = 20.dp).onRotaryScrollEvent { event ->
        accumulated += event.verticalScrollPixels
        if (abs(accumulated) >= 20f) { adjust(if (accumulated > 0) 1 else -1); accumulated = 0f }; true
    }.focusRequester(focus).focusable(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(label, fontSize = 12.sp)
        Text(formatNumber(value), fontSize = 32.sp, color = Color(0xFFC3EE74))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { adjust(-1) }, modifier = Modifier.weight(1f).height(44.dp), enabled = value > min) { Text("−", fontSize = 24.sp) }
            Button(onClick = { adjust(1) }, modifier = Modifier.weight(1f).height(44.dp), enabled = value < max) { Text("+", fontSize = 24.sp) }
        }
        Spacer(Modifier.height(4.dp))
        Button(onClick = done, modifier = Modifier.fillMaxWidth().height(44.dp)) { Text("Done") }
    }
}
private fun describe(op: Operation): String {
    val c = op.command; val type = c["type"]?.jsonPrimitive?.content.orEmpty()
    val log = c["log"]?.jsonObject
    return "${c["slotId"]?.jsonPrimitive?.content ?: "Workout"} · $type" +
        (c["index"]?.jsonPrimitive?.intOrNull?.let { " · set ${it + 1}" } ?: "") +
        (log?.let { "\n${it["reps"]?.jsonPrimitive?.content.orEmpty()} reps/min · ${it["load"]?.jsonPrimitive?.content.orEmpty()} · ${if (it["done"]?.jsonPrimitive?.boolean == true) "done" else "undone"}" } ?: "") +
        "\nSession ${c["id"]?.jsonPrimitive?.content.orEmpty().take(8)}"
}
