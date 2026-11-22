Add-Type -AssemblyName System.Drawing
$dir = "c:\Users\ASGEROV\IdeaProjects\thyroid_new\placeholder_images"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
for ($i=1; $i -le 50; $i++) {
    $bmp = New-Object System.Drawing.Bitmap 800, 600
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $brush = [System.Drawing.Brushes]::Black
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $font = New-Object System.Drawing.Font ($fontFamily, [float]64.0, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF ([float]0.0, [float]0.0, [float]800.0, [float]600.0)
    $g.DrawString("Image #$i", $font, $brush, $rect, $sf)
    $filePath = Join-Path $dir "image_$i.png"
    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $font.Dispose()
    $bmp.Dispose()
}
$count = (Get-ChildItem $dir -Filter *.png).Count
Write-Output "Successfully generated $count images in $dir"
