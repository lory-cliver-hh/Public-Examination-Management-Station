$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-StarPath {
  param(
    [float]$CenterX,
    [float]$CenterY,
    [float]$OuterRadius,
    [float]$InnerRadius,
    [int]$Points = 4
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $pointList = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  $step = [Math]::PI / $Points

  for ($index = 0; $index -lt ($Points * 2); $index++) {
    $radius = if ($index % 2 -eq 0) { $OuterRadius } else { $InnerRadius }
    $angle = ($index * $step) - ([Math]::PI / 2)
    $x = $CenterX + [Math]::Cos($angle) * $radius
    $y = $CenterY + [Math]::Sin($angle) * $radius
    $pointList.Add((New-Object System.Drawing.PointF($x, $y)))
  }

  $path.AddPolygon($pointList.ToArray())
  return $path
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$pngPath = Join-Path $root "gongkao-manager-cartoon.png"
$icoPath = Join-Path $root "gongkao-manager-cartoon.ico"

$size = 256
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 27, 38, 32))
$graphics.FillEllipse($shadowBrush, 38, 188, 180, 30)

$backgroundRect = New-Object System.Drawing.RectangleF(18, 18, 220, 220)
$backgroundPath = New-RoundedRectPath -X 18 -Y 18 -Width 220 -Height 220 -Radius 42
$backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $backgroundRect,
  [System.Drawing.Color]::FromArgb(255, 248, 241, 223),
  [System.Drawing.Color]::FromArgb(255, 235, 223, 201),
  55
)
$graphics.FillPath($backgroundBrush, $backgroundPath)
$backgroundPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 32, 52, 73), 6)
$graphics.DrawPath($backgroundPen, $backgroundPath)

$dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 89, 112, 98))
for ($row = 0; $row -lt 5; $row++) {
  for ($col = 0; $col -lt 5; $col++) {
    $graphics.FillEllipse($dotBrush, 42 + ($col * 34), 42 + ($row * 30), 4, 4)
  }
}

$notePath = New-RoundedRectPath -X 58 -Y 52 -Width 120 -Height 136 -Radius 24
$noteBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.RectangleF(58, 52, 120, 136)),
  [System.Drawing.Color]::FromArgb(255, 255, 254, 249),
  [System.Drawing.Color]::FromArgb(255, 245, 239, 228),
  90
)
$graphics.FillPath($noteBrush, $notePath)
$notePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 32, 52, 73), 5)
$graphics.DrawPath($notePen, $notePath)

$bookmarkPath = New-RoundedRectPath -X 126 -Y 42 -Width 26 -Height 52 -Radius 10
$bookmarkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 182, 95, 51))
$graphics.FillPath($bookmarkBrush, $bookmarkPath)
$graphics.FillPolygon(
  (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 140, 63, 24))),
  [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(126, 86)),
    (New-Object System.Drawing.PointF(139, 103)),
    (New-Object System.Drawing.PointF(152, 86))
  )
)

$ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 89, 112, 98), 4)
foreach ($ringX in @(80, 108, 136)) {
  $graphics.DrawEllipse($ringPen, $ringX, 42, 18, 24)
}

$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 32, 52, 73), 3)
foreach ($lineY in @(92, 114, 136)) {
  $graphics.DrawLine($linePen, 74, $lineY, 154, $lineY)
}

$eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 32, 52, 73))
$graphics.FillEllipse($eyeBrush, 92, 96, 10, 14)
$graphics.FillEllipse($eyeBrush, 126, 96, 10, 14)
$highlightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 255, 255, 255))
$graphics.FillEllipse($highlightBrush, 95, 99, 3, 4)
$graphics.FillEllipse($highlightBrush, 129, 99, 3, 4)

$blushBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 232, 145, 135))
$graphics.FillEllipse($blushBrush, 77, 112, 18, 10)
$graphics.FillEllipse($blushBrush, 141, 112, 18, 10)

$smilePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 32, 52, 73), 4)
$graphics.DrawArc($smilePen, 96, 112, 36, 24, 10, 160)

$cheekHeartPath = New-StarPath -CenterX 161 -CenterY 76 -OuterRadius 8 -InnerRadius 4 -Points 4
$heartBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 209, 170, 89))
$graphics.FillPath($heartBrush, $cheekHeartPath)

$pencilState = $graphics.Save()
$graphics.TranslateTransform(186, 156)
$graphics.RotateTransform(33)

$pencilBodyPath = New-RoundedRectPath -X -18 -Y -70 -Width 36 -Height 120 -Radius 14
$pencilBodyBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.RectangleF(-18, -70, 36, 120)),
  [System.Drawing.Color]::FromArgb(255, 255, 199, 88),
  [System.Drawing.Color]::FromArgb(255, 242, 171, 60),
  90
)
$graphics.FillPath($pencilBodyBrush, $pencilBodyPath)
$pencilBodyPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 181, 118, 35), 4)
$graphics.DrawPath($pencilBodyPen, $pencilBodyPath)

$eraserPath = New-RoundedRectPath -X -18 -Y -84 -Width 36 -Height 28 -Radius 12
$eraserBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 239, 132, 123))
$graphics.FillPath($eraserBrush, $eraserPath)
$graphics.DrawPath((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 188, 101, 95), 4)), $eraserPath)

$metalBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 197, 202, 208))
$graphics.FillRectangle($metalBrush, -18, -56, 36, 12)

$tipBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 247, 219, 177))
$graphics.FillPolygon(
  $tipBrush,
  [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(-18, 50)),
    (New-Object System.Drawing.PointF(18, 50)),
    (New-Object System.Drawing.PointF(0, 82))
  )
)
$leadBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 53, 64, 75))
$graphics.FillPolygon(
  $leadBrush,
  [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(-6, 70)),
    (New-Object System.Drawing.PointF(6, 70)),
    (New-Object System.Drawing.PointF(0, 88))
  )
)
$graphics.Restore($pencilState)

$sparkleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 240, 190))
$sparklePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 209, 170, 89), 3)
foreach ($sparkle in @(
  @{ X = 188; Y = 62; Outer = 12; Inner = 5 },
  @{ X = 198; Y = 104; Outer = 9; Inner = 4 },
  @{ X = 54; Y = 176; Outer = 10; Inner = 4 }
)) {
  $star = New-StarPath -CenterX $sparkle.X -CenterY $sparkle.Y -OuterRadius $sparkle.Outer -InnerRadius $sparkle.Inner -Points 4
  $graphics.FillPath($sparkleBrush, $star)
  $graphics.DrawPath($sparklePen, $star)
}

$graphics.Dispose()
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$iconStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($iconStream)

$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)
$writer.Write($pngBytes)
$writer.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $iconStream.ToArray())

$writer.Dispose()
$iconStream.Dispose()
$bitmap.Dispose()

Write-Output "Generated $icoPath"
