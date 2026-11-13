package ru.sarexpo.ledger;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    private static final int SAVE = 1, OPEN = 2, LIMIT = 12 * 1024 * 1024;
    private File pending() { return new File(getCacheDir(), "pending-export.json"); }

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setStatusBarColor(0xff182026);
        getWindow().setNavigationBarColor(0xff182026);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowFileAccessFromFileURLs(false);
        web.getSettings().setAllowUniversalAccessFromFileURLs(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return true; }
        });
        web.addJavascriptInterface(new Documents(), "SarFiles");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }
    private void message(String value) { Toast.makeText(this, value, Toast.LENGTH_LONG).show(); }
    public class Documents {
        @JavascriptInterface public void exportData(String json) {
            runOnUiThread(() -> {
                try (FileOutputStream out = new FileOutputStream(pending())) {
                    byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
                    if (bytes.length > LIMIT) throw new IOException();
                    out.write(bytes);
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, "SarExpo74-" + new java.text.SimpleDateFormat("yyyyMMdd-HHmm", java.util.Locale.ROOT).format(new java.util.Date()) + ".json");
                    startActivityForResult(intent, SAVE);
                } catch (Exception e) { message("Не удалось начать экспорт"); }
            });
        }
        @JavascriptInterface public void importData() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try { startActivityForResult(intent, OPEN); } catch (Exception e) { message("Не удалось открыть выбор файла"); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            if (request == SAVE) {
                try (InputStream in = new FileInputStream(pending()); OutputStream out = getContentResolver().openOutputStream(uri, "wt")) { copy(in,out); }
                pending().delete();
                message("Резервная копия сохранена");
            } else if (request == OPEN) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream in = getContentResolver().openInputStream(uri)) { copy(in, bytes); }
                web.evaluateJavascript("window.receiveBackup(" + JSONObject.quote(bytes.toString("UTF-8")) + ")", null);
            }
        } catch (Exception e) { message("Ошибка файла. Проверь размер и доступ."); }
    }
    private void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[8192]; int n, total=0;
        while ((n=in.read(buf)) != -1) { total+=n; if(total>LIMIT) throw new IOException(); out.write(buf,0,n); }
        out.flush();
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.sarBack ? window.sarBack() : false", answer -> {
            if (!"true".equals(answer)) super.onBackPressed();
        });
    }
}
