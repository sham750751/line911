package com.codex.voidvector;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.ValueCallback;
import android.annotation.SuppressLint;

public final class MainActivity extends Activity {
    private WebView game;
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.rgb(6,11,23));
        getWindow().setNavigationBarColor(Color.rgb(6,11,23));
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(6,11,23));
        game.getSettings().setJavaScriptEnabled(true);
        game.getSettings().setDomStorageEnabled(true);
        game.getSettings().setAllowFileAccess(true);
        game.getSettings().setAllowContentAccess(false);
        game.getSettings().setAllowFileAccessFromFileURLs(false);
        game.getSettings().setAllowUniversalAccessFromFileURLs(false);
        game.getSettings().setMediaPlaybackRequiresUserGesture(true);
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        game.setWebChromeClient(new WebChromeClient());
        game.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().equals("file:///android_asset/game.html");
            }
        });
        setContentView(game);
        immersive();
        game.loadUrl("file:///android_asset/game.html");
    }
    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }
    @Override protected void onPause() {
        if (game != null) {
            game.evaluateJavascript("window.pauseGame && window.pauseGame()", null);
            game.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
        immersive();
    }
    @Override public void onBackPressed() {
        game.evaluateJavascript("window.handleBack ? window.handleBack() : false", new ValueCallback<String>() {
            @Override public void onReceiveValue(String handled) {
                if (!"true".equals(handled)) finish();
            }
        });
    }
    @Override protected void onDestroy() {
        if (game != null) {
            game.stopLoading();
            game.destroy();
            game = null;
        }
        super.onDestroy();
    }
}
