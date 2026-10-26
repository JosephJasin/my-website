package com.firstrep.watch

import androidx.wear.tiles.TileService
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.protolayout.*
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.ModifiersBuilders.*
import androidx.wear.protolayout.ActionBuilders.*
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

class FirstRepTile : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val launch = LaunchAction.Builder().setAndroidActivity(AndroidActivity.Builder().setPackageName(packageName).setClassName(MainActivity::class.java.name).build()).build()
        val button = LayoutElementBuilders.Box.Builder().setWidth(dp(150f)).setHeight(dp(56f))
            .setModifiers(Modifiers.Builder().setClickable(Clickable.Builder().setId("open_firstrep").setOnClick(launch).build())
                .setSemantics(Semantics.Builder().setContentDescription("Start or resume First Rep workout").build())
                .setBackground(Background.Builder().setColor(ColorBuilders.argb(0xFFC3EE74.toInt())).setCorner(Corner.Builder().setRadius(dp(28f)).build()).build()).build())
            .addContent(LayoutElementBuilders.Text.Builder().setText("Start / Resume").setFontStyle(LayoutElementBuilders.FontStyle.Builder().setSize(DimensionBuilders.sp(16f)).setColor(ColorBuilders.argb(0xFF17210F.toInt())).build()).build()).build()
        val content = LayoutElementBuilders.Column.Builder().setWidth(expand()).setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .addContent(LayoutElementBuilders.Text.Builder().setText("firstrep. β").setFontStyle(LayoutElementBuilders.FontStyle.Builder().setSize(DimensionBuilders.sp(20f)).setColor(ColorBuilders.argb(0xFFC3EE74.toInt())).build()).build())
            .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(12f)).build()).addContent(button).build()
        return Futures.immediateFuture(TileBuilders.Tile.Builder().setResourcesVersion("1").setTileTimeline(TimelineBuilders.Timeline.Builder().addTimelineEntry(TimelineBuilders.TimelineEntry.Builder().setLayout(LayoutElementBuilders.Layout.Builder().setRoot(LayoutElementBuilders.Box.Builder().setWidth(expand()).setHeight(expand()).addContent(content).build()).build()).build()).build()).build())
    }
    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> = Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion("1").build())
}
