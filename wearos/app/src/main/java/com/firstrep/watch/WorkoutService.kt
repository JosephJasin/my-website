package com.firstrep.watch

import android.app.*
import android.content.Intent
import android.os.*
import androidx.core.app.NotificationCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import kotlinx.coroutines.*

class WorkoutService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var loop: Job? = null
    override fun onBind(intent: Intent?) = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val repo = (application as FirstRepApp).repository
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("workout", "Active workout", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = NotificationCompat.Builder(this, "workout").setSmallIcon(R.drawable.ic_workout_status).setContentTitle("First Rep workout")
            .setContentText("Tap to return to your sets").setContentIntent(open).setOngoing(true).setCategory(NotificationCompat.CATEGORY_SERVICE)
        OngoingActivity.Builder(this, 1, notification).setStaticIcon(R.drawable.ic_workout_status).setTouchIntent(open)
            .setStatus(Status.Builder().addTemplate("Workout in progress").build()).build().apply(this)
        startForeground(1, notification.build())
        if (loop == null) loop = scope.launch {
            var ticks = 0; var inactive = 0
            while (isActive) {
                if (repo.restCompleted()) {
                    @Suppress("DEPRECATION")
                    val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
                    vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 140, 100, 140), -1))
                }
                if (ticks++ % 15 == 0) launch { repo.sync() }
                val j = repo.state.value.journal
                if (j.snapshot?.active == null) inactive++ else inactive = 0
                if (j.blocked.isNotEmpty() || (j.snapshot?.active == null && (j.pending.isEmpty() || inactive > 60))) {
                    stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); break
                }
                delay(1000)
            }
        }
        return START_STICKY
    }
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}
