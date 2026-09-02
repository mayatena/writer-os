# Writer OS — Servidor Local Ligero en PowerShell (Sin dependencias externas)

$port = 5173
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    # Si el puerto 5173 está ocupado, probar con 5174
    $port = 5174
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

$rootPath = $PSScriptRoot
if (-not $rootPath) {
    $rootPath = (Get-Location).Path
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Writer OS — Servidor Local Iniciado" -ForegroundColor Green
Write-Host "   URL: http://localhost:$port" -ForegroundColor Yellow
Write-Host "   Directorio: $rootPath" -ForegroundColor Gray
Write-Host "   Presiona Ctrl + C en esta ventana para detenerlo." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan

# Abrir en el navegador predeterminado
Start-Process "http://localhost:$port"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $urlPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath) -or $urlPath -eq "/") {
        $urlPath = "index.html"
    }

    $filePath = Join-Path $rootPath $urlPath

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
        
        $response.ContentType = $mime
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 - Archivo no encontrado")
        $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
    }

    $response.OutputStream.Close()
}
