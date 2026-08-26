Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds

$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size)

$outputPath = "C:\Users\asus\.gemini\antigravity\brain\0c594bdf-3776-4d1f-b63f-e8bbc2cd8f26\actual_site_screenshot.png"
$bitmap.Save($outputPath)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Screenshot saved successfully to $outputPath!"
