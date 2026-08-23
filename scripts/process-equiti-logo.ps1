Add-Type -AssemblyName System.Drawing
$src = "C:\Users\ashah\Desktop\nexus-app\frontend\public\brand\equiti-logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$out = New-Object System.Drawing.Bitmap $bmp.Width, $bmp.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $bmp.Height; $y++) {
  for ($x = 0; $x -lt $bmp.Width; $x++) {
    $c = $bmp.GetPixel($x, $y)
    $r = $c.R; $g = $c.G; $b = $c.B
    $isWhite = ($r -gt 220 -and $g -gt 220 -and $b -gt 220)
    $isBlackBar = ($r -lt 40 -and $g -lt 40 -and $b -lt 40)
    if ($isWhite -or $isBlackBar) {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    } else {
      $out.SetPixel($x, $y, $c)
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$pad = 8
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
$maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)
$w = $maxX - $minX + 1
$h = $maxY - $minY + 1
$crop = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gfx = [System.Drawing.Graphics]::FromImage($crop)
$gfx.DrawImage($out, 0, 0, (New-Object System.Drawing.Rectangle $minX, $minY, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
$gfx.Dispose()
$bmp.Dispose()
$out.Dispose()
$crop.Save($src, [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
Write-Output "cropped ${w}x${h}"
