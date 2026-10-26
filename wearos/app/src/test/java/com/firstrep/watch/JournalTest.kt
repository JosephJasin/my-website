package com.firstrep.watch

import kotlinx.serialization.json.*
import org.junit.Assert.*
import org.junit.Test

class JournalTest {
    private val slot = Slot("press", "Chest", "8–12", option = Exercise("chest-press", "Chest press"), logs = listOf(SetLog(), SetLog()))
    private val snapshot = Snapshot(active = Session("session", "A", 0, slots = listOf(slot)))
    private fun set(s: Snapshot, index: Int, done: Boolean = true) = command("set", s.active!!) { put("slotId", "press"); put("index", index); put("log", wire.encodeToJsonElement(SetLog("10", "20 kg", done))) }
    @Test fun offlineTwoSetsSurviveRestartAndSequentialAcknowledgements() {
        val first = Operation(command = set(snapshot, 0)); val one = applyCommand(snapshot, first.command)
        val second = Operation(command = set(one, 1)); val two = applyCommand(one, second.command)
        val journal = Journal(snapshot = two, pending = listOf(first, second))
        val restored = wire.decodeFromString<Journal>(wire.encodeToString(Journal.serializer(), journal))
        val ackOne = acknowledge(restored, first.operationId, one)
        assertEquals(2, ackOne.snapshot!!.active!!.revision)
        assertEquals(1, ackOne.pending.size)
        assertTrue(ackOne.snapshot!!.active!!.slots[0].logs.all { it.done })
        val ackTwo = acknowledge(ackOne, second.operationId, two)
        assertTrue(ackTwo.pending.isEmpty()); assertNull(currentSet(ackTwo.snapshot!!.active))
    }
    @Test fun undoMovesBackToCorrectSetWithoutErasingEarlierSet() {
        val one = applyCommand(snapshot, set(snapshot, 0)); val two = applyCommand(one, set(one, 1))
        val undone = applyCommand(two, set(two, 1, false))
        assertEquals(1, currentSet(undone.active)!!.second); assertTrue(undone.active!!.slots[0].logs[0].done)
    }
    @Test fun skipRetainsCompletedSetsAndFinishRemovesOnlyActiveView() {
        val one = applyCommand(snapshot, set(snapshot, 0))
        val skipped = applyCommand(one, command("skip", one.active!!) { put("slotId", "press"); put("skipped", true) })
        assertTrue(skipped.active!!.slots[0].logs[0].done); assertNull(currentSet(skipped.active))
        assertNull(applyCommand(skipped, command("finish", skipped.active!!)).active)
    }
    @Test fun staleOrRepeatedCommandsCannotAdvanceLocalRevision() {
        val c = set(snapshot, 0); val one = applyCommand(snapshot, c)
        assertThrows(IllegalArgumentException::class.java) { applyCommand(one, c) }
    }
    @Test fun acknowledgementsCannotDropUnrelatedPendingOperation() {
        val journal = Journal(snapshot = snapshot, pending = listOf(Operation(command = set(snapshot, 0))))
        assertThrows(IllegalArgumentException::class.java) { acknowledge(journal, "wrong-id", snapshot) }
    }
}
