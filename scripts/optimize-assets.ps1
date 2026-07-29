param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\assets\img'),
  [string]$OutputRoot = (Join-Path $PSScriptRoot '..\assets\optimized')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Save-OptimizedJpeg {
  param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Destination,
    [int]$MaxWidth = 1200,
    [int]$Quality = 86
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Source image not found: $Source"
  }

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  try {
    [double]$scale = [Math]::Min(1.0, ([double]$MaxWidth / [double]$sourceImage.Width))
    $width = [Math]::Max(1, [int][Math]::Round($sourceImage.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($sourceImage.Height * $scale))
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $bitmap.SetResolution(96, 96)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($sourceImage, 0, 0, $width, $height)
      }
      finally {
        $graphics.Dispose()
      }

      $directory = Split-Path -Parent $Destination
      New-Item -ItemType Directory -Force -Path $directory | Out-Null
      $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object MimeType -eq 'image/jpeg'
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality,
        [long]$Quality
      )
      $bitmap.Save($Destination, $jpegCodec, $encoderParams)
      $encoderParams.Dispose()
    }
    finally {
      $bitmap.Dispose()
    }
  }
  finally {
    $sourceImage.Dispose()
  }
}

$websiteScreens = @(
  'trinity-abode.vercel.app.png',
  'waski-gadgets.vercel.app.png',
  'lapeq.net.png',
  'blake-resort.vercel.app.png'
)

foreach ($screen in $websiteScreens) {
  $fileNameBase = [IO.Path]::GetFileNameWithoutExtension($screen)
  Save-OptimizedJpeg -Source (Join-Path $SourceRoot $screen) -Destination (Join-Path $OutputRoot "websites\$fileNameBase.jpg") -MaxWidth 1600 -Quality 86
  Save-OptimizedJpeg -Source (Join-Path $SourceRoot $screen) -Destination (Join-Path $OutputRoot "websites\$fileNameBase-640.jpg") -MaxWidth 640 -Quality 82
}

Save-OptimizedJpeg -Source (Join-Path $SourceRoot 'my portrait.png') -Destination (Join-Path $OutputRoot 'emmanuel-oyewola.jpg') -MaxWidth 760 -Quality 82
Save-OptimizedJpeg -Source (Join-Path $SourceRoot 'my portrait.png') -Destination (Join-Path $OutputRoot 'emmanuel-oyewola-480.jpg') -MaxWidth 480 -Quality 80

$gallery = [ordered]@{
  'aventro-x' = @('AventroX\1.png', 'AventroX\3.png', 'AventroX\5.png', 'AventroX\7.png')
  'datalab' = @('datalab\How to Become a Global Data Analyst.png', 'datalab\How to Find Remote Jobs Abroad.png', 'datalab\H-1B Visa Effect On The Africa Tech.png', 'datalab\da-Recovered.png')
  'hue2max' = @('hue2max\banner1.png', 'hue2max\banner2.png', 'hue2max\hue2max sales.png', 'hue2max\new month may.png')
  'jimmy-gadgets' = @('jimmy gadgets store\jimmy gadgets.png', 'jimmy gadgets store\JIM2.png', 'jimmy gadgets store\invoice.png', 'jimmy gadgets store\id.png')
  'lapeq' = @('Lapeq\Branding\Lapeq full brandin.png', 'Lapeq\mockups\id card.png', 'Lapeq\mockups\t-shirt mockup 1.png', 'Lapeq\socials\lapeq app ad.png', 'Lapeq\socials\social media ad.png', "Lapeq\qoute\Privacy is the highest form of luxury today.png")
  'obys-kitchen' = @("oby's kitchen\top front.png", "oby's kitchen\top sides.png", "oby's kitchen\side panel 2.png", "oby's kitchen\back panel.png")
  'rivo-rider' = @('rivo rider\RIVO RIDER11.png', 'rivo rider\Rivo Rider2.png', 'rivo rider\rivo rider card front.png', 'rivo rider\rivo rider side.png')
  'veroshun' = @('veroshun\VEROSHUN.png', 'veroshun\bs1.png', 'veroshun\bs3.png')
  'yrn-accommodation' = @('yrn accommodation\YRN accommodation.png', 'yrn accommodation\YRN.png')
}

foreach ($client in $gallery.GetEnumerator()) {
  $index = 1
  foreach ($relativePath in $client.Value) {
    $destination = Join-Path $OutputRoot ("gallery\{0}\{1}.jpg" -f $client.Key, $index)
    Save-OptimizedJpeg -Source (Join-Path $SourceRoot $relativePath) -Destination $destination -MaxWidth 1200 -Quality 86
    $index++
  }
}

Write-Output "Optimized portfolio assets written to $OutputRoot"
