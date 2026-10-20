package com.ppgames.prochess;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private WebView webView;
    private PermissionRequest pendingRequest;
    private static final int MEDIA_PERMISSION_CODE = 1001;
    private final String[] mediaPermissions = {Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO};
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!"https://appassets.androidplatform.net".equals(request.getOrigin().toString().replaceAll("/$", ""))) {
                        request.deny(); return;
                    }
                    boolean media = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) || PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) media = true;
                        else { request.deny(); return; }
                    }
                    if (!media) { request.deny(); return; }
                    pendingRequest = request;
                    if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
                        checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(mediaPermissions, MEDIA_PERMISSION_CODE);
                    } else grantPending();
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingRequest == request) pendingRequest = null;
            }
        });
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }
    private void grantPending() {
        if (pendingRequest == null) return;
        ArrayList<String> granted = new ArrayList<>();
        for (String resource : pendingRequest.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) granted.add(resource);
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) granted.add(resource);
        }
        if (granted.size() == pendingRequest.getResources().length) pendingRequest.grant(granted.toArray(new String[0]));
        else pendingRequest.deny();
        pendingRequest = null;
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == MEDIA_PERMISSION_CODE) grantPending();
    }
    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() { if (pendingRequest != null) pendingRequest.deny(); webView.destroy(); super.onDestroy(); }
}
