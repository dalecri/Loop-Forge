package com.loopforge.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Local HTTPS WebView shell. No server, analytics, or background recording. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int MIC=10, PICK=11, SAVE=12;
    private WebView web;
    private PermissionRequest pendingMic;
    private ValueCallback<Uri[]> pendingFiles;
    private String pendingExport;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web=new WebView(this);
        web.setBackgroundColor(0xff222527);
        // Keep controls clear of system bars on Android 15 edge-to-edge windows.
        web.setOnApplyWindowInsetsListener((v,insets)->{
            v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(web);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new ExportBridge(),"LoopForgeAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(!"appassets.androidplatform.net".equals(uri.getHost())) return null;
                String path=uri.getPath();
                if(path==null || path.equals("/")) path="/index.html";
                if(path.contains("..") || !"https".equals(uri.getScheme())) return missing();
                try {
                    String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".html")?"text/html":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".woff2")?"font/woff2":"application/octet-stream";
                    WebResourceResponse response=new WebResourceResponse(mime,"UTF-8",getAssets().open("web"+path));
                    response.setResponseHeaders(Collections.singletonMap("Content-Security-Policy","frame-src 'none'; object-src 'none'"));
                    return response;
                } catch(IOException e){return missing();}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(ORIGIN.equals(uri.getScheme()+"://"+uri.getAuthority())) return false;
                if(request.isForMainFrame() && request.hasGesture() && "https".equals(uri.getScheme())) {
                    try {startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){notice("No browser available.");}
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{
                if(!ORIGIN.equals(request.getOrigin().toString().replaceAll("/$",""))) {request.deny();return;}
                boolean audio=false;
                for(String resource:request.getResources()) if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) audio=true;
                if(!audio){request.deny();return;}
                if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});return;}
                if(pendingMic!=null) pendingMic.deny();
                pendingMic=request;
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC);
            });}
            @Override public void onPermissionRequestCanceled(PermissionRequest request){if(pendingMic==request) pendingMic=null;}
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(pendingFiles!=null) pendingFiles.onReceiveValue(null);
                pendingFiles=callback;
                try {startActivityForResult(params.createIntent(),PICK);}catch(Exception e){pendingFiles.onReceiveValue(null);pendingFiles=null;notice("No file picker available.");}
                return true;
            }
        });
        web.loadUrl(ORIGIN+"/index.html");
    }
    private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
    private void notice(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){
        super.onRequestPermissionsResult(request,permissions,results);
        if(request==MIC && pendingMic!=null){
            if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED) pendingMic.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else pendingMic.deny();
            pendingMic=null;
        }
    }
    final class ExportBridge {
        @JavascriptInterface public void saveFile(String name,String json){
            if(json==null || json.length()>12*1024*1024) return;
            runOnUiThread(()->{
                if(web.getUrl()==null || !web.getUrl().startsWith(ORIGIN+"/") || pendingExport!=null) return;
                pendingExport=json;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,(name==null?"loop-forge.json":name.replaceAll("[^a-zA-Z0-9._-]","_")));
                try{startActivityForResult(intent,SAVE);}catch(Exception e){pendingExport=null;notice("No file saver available.");}
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==PICK && pendingFiles!=null){pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));pendingFiles=null;}
        if(request==SAVE){
            String json=pendingExport; pendingExport=null;
            if(result==RESULT_OK && data!=null && data.getData()!=null && json!=null){
                Uri uri=data.getData();
                new Thread(()->{
                    try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){
                        if(out==null) throw new IOException();
                        out.write(json.getBytes(StandardCharsets.UTF_8));runOnUiThread(()->notice("Loop saved."));
                    }catch(Exception e){runOnUiThread(()->notice("Could not save the loop. Please try again."));}
                }).start();
            }
        }
    }
    @Override protected void onPause(){
        // Dispatch the app's pagehide handler to stop/discard any active take.
        web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));document.querySelector('.play.is-playing')?.click();",null);
        web.onPause();super.onPause();
    }
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override public void onBackPressed(){web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.querySelector('[data-act=close-dialog]')?.click();return true;}return false;})()",value->{if(!"true".equals(value))moveTaskToBack(true);});}
    @Override protected void onDestroy(){
        if(pendingMic!=null)pendingMic.deny();
        if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
        web.removeJavascriptInterface("LoopForgeAndroid");web.destroy();super.onDestroy();
    }
}
