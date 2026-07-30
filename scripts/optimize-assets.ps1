param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\assets\img'),
  [string]$OutputRoot = (Join-Path $PSScriptRoot '..\assets\optimized'),
  [string]$ManifestPath = (Join-Path $PSScriptRoot '..\gallery-data.js')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$clientMetadata = [ordered]@{
  'Lapeq' = @{ Order = 1; Title = 'Lapeq'; Type = 'Brand identity and social design'; Description = 'A premium visual system spanning identity, corporate touchpoints, merchandise, campaigns, and social content.' }
  'AventroX' = @{ Order = 2; Title = 'Aventro X'; Type = 'Identity exploration'; Description = 'A bold identity study developed across a focused collection of recognizable visual directions.' }
  'datalab' = @{ Order = 3; Title = 'Datalab'; Type = 'Educational content campaign'; Description = 'A repeatable editorial system that makes technical career content clear, recognizable, and easy to scan.' }
  'hue2max' = @{ Order = 4; Title = 'Hue2max'; Type = 'Retail campaign design'; Description = 'A flexible promotional language created to keep retail offers energetic, clear, and consistently on brand.' }
  'jimmy gadgets store' = @{ Order = 5; Title = 'Jimmy Gadgets'; Type = 'Retail identity and business materials'; Description = 'A practical suite of branded assets designed to make a growing technology retailer feel consistent and established.' }
  "oby's kitchen" = @{ Order = 6; Title = "Oby's Kitchen"; Type = 'Food packaging'; Description = 'An appetite-led packaging system that keeps the brand prominent across every panel and viewing angle.' }
  'rivo rider' = @{ Order = 7; Title = 'Rivo Rider'; Type = 'Mobility brand identity'; Description = 'A high-visibility identity designed for a mobility brand operating across physical and digital touchpoints.' }
  'veroshun' = @{ Order = 8; Title = 'Veroshun'; Type = 'Fashion campaign design'; Description = 'A sharp editorial direction created to give a fashion brand a confident and contemporary presence.' }
  'yrn accommodation' = @{ Order = 9; Title = 'YRN Accommodation'; Type = 'Property campaign design'; Description = 'A focused promotional system that presents student accommodation clearly and keeps the offer recognizable.' }
}

$folderNames = @{
  'qoute' = 'Quotes'
  'mockups' = 'Mockups'
  'socials' = 'Socials'
  'branding' = 'Branding'
  'did you know' = 'Did You Know'
}

function ConvertTo-Slug {
  param([Parameter(Mandatory)] [string]$Value)
  $slug = [regex]::Replace($Value.ToLowerInvariant(), '[^a-z0-9]+', '-').Trim('-')
  if ($slug) { return $slug }
  return 'item'
}

function ConvertTo-DisplayName {
  param([Parameter(Mandatory)] [string]$Value)
  $key = $Value.ToLowerInvariant()
  if ($folderNames.ContainsKey($key)) { return $folderNames[$key] }
  $spaced = [regex]::Replace($Value, '[_-]+', ' ').Trim()
  return (Get-Culture).TextInfo.ToTitleCase($spaced.ToLowerInvariant())
}

function Save-OptimizedJpeg {
  param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Destination,
    [int]$MaxWidth = 1800,
    [int]$Quality = 88
  )

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
      $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
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

  return [ordered]@{ width = $width; height = $height }
}

function New-ImageRecord {
  param(
    [Parameter(Mandatory)] [System.IO.FileInfo]$File,
    [Parameter(Mandatory)] [string]$DestinationDirectory,
    [Parameter(Mandatory)] [string]$UrlDirectory,
    [Parameter(Mandatory)] [int]$Index,
    [Parameter(Mandatory)] [string]$ClientTitle,
    [Parameter(Mandatory)] [string]$FolderTitle
  )

  $baseName = '{0:D3}' -f $Index
  $largePath = Join-Path $DestinationDirectory "$baseName.jpg"
  $thumbnailPath = Join-Path $DestinationDirectory "$baseName-thumb.jpg"
  $large = Save-OptimizedJpeg -Source $File.FullName -Destination $largePath -MaxWidth 1800 -Quality 88
  $null = Save-OptimizedJpeg -Source $File.FullName -Destination $thumbnailPath -MaxWidth 720 -Quality 80

  $sourceTitle = ConvertTo-DisplayName ([IO.Path]::GetFileNameWithoutExtension($File.Name))
  if ($sourceTitle -match '^\d+$') {
    $alt = "$ClientTitle $FolderTitle design $Index"
  }
  else {
    $alt = "$ClientTitle, $sourceTitle"
  }

  return [ordered]@{
    src = "$UrlDirectory/$baseName.jpg"
    thumbnail = "$UrlDirectory/$baseName-thumb.jpg"
    width = $large.width
    height = $large.height
    alt = $alt
  }
}

function New-FolderNode {
  param(
    [Parameter(Mandatory)] [System.IO.DirectoryInfo]$Directory,
    [Parameter(Mandatory)] [string]$ClientTitle,
    [Parameter(Mandatory)] [string[]]$SlugParts,
    [Parameter(Mandatory)] [string]$Title
  )

  $urlDirectory = 'assets/optimized/portfolio/' + ($SlugParts -join '/')
  $destinationDirectory = Join-Path $OutputRoot ('portfolio\' + ($SlugParts -join '\'))
  $files = @(Get-ChildItem -LiteralPath $Directory.FullName -File | Where-Object { $_.Extension -match '^\.(png|jpe?g)$' } | Sort-Object Name)
  $images = @()
  for ($index = 0; $index -lt $files.Count; $index++) {
    $images += New-ImageRecord -File $files[$index] -DestinationDirectory $destinationDirectory -UrlDirectory $urlDirectory -Index ($index + 1) -ClientTitle $ClientTitle -FolderTitle $Title
  }

  $children = @()
  foreach ($child in @(Get-ChildItem -LiteralPath $Directory.FullName -Directory | Sort-Object Name)) {
    $childSlug = ConvertTo-Slug $child.Name
    $childTitle = ConvertTo-DisplayName $child.Name
    $children += New-FolderNode -Directory $child -ClientTitle $ClientTitle -SlugParts ($SlugParts + $childSlug) -Title $childTitle
  }

  $imageCount = $images.Count
  foreach ($child in $children) { $imageCount += $child.imageCount }
  $preview = if ($images.Count) { $images[0] } elseif ($children.Count) { $children[0].preview } else { $null }

  return [ordered]@{
    id = ($SlugParts -join '/')
    title = $Title
    imageCount = $imageCount
    directImageCount = $images.Count
    preview = $preview
    images = $images
    children = $children
  }
}

$portfolioRoot = Join-Path $OutputRoot 'portfolio'
if (Test-Path -LiteralPath $portfolioRoot) {
  $resolvedOutput = (Resolve-Path -LiteralPath $portfolioRoot).Path
  $resolvedExpectedParent = (Resolve-Path -LiteralPath $OutputRoot).Path
  if (-not $resolvedOutput.StartsWith($resolvedExpectedParent, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear unexpected output path: $resolvedOutput"
  }
  Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}

$clients = @()
$clientDirectories = @(Get-ChildItem -LiteralPath $SourceRoot -Directory | Sort-Object {
  if ($clientMetadata.Contains($_.Name)) { $clientMetadata[$_.Name].Order } else { 1000 }
}, Name)

foreach ($directory in $clientDirectories) {
  $metadata = if ($clientMetadata.Contains($directory.Name)) {
    $clientMetadata[$directory.Name]
  }
  else {
    @{ Title = (ConvertTo-DisplayName $directory.Name); Type = 'Design collection'; Description = 'A collection of visual design work organized as it appears in the source archive.' }
  }
  $slug = ConvertTo-Slug $directory.Name
  $node = New-FolderNode -Directory $directory -ClientTitle $metadata.Title -SlugParts @($slug) -Title $metadata.Title
  $node.type = $metadata.Type
  $node.description = $metadata.Description
  $clients += $node
  Write-Output ("Processed {0}: {1} images" -f $metadata.Title, $node.imageCount)
}

$additionalFiles = @('Aventro_X.png', 'pburgers.png') | ForEach-Object { Get-Item -LiteralPath (Join-Path $SourceRoot $_) }
$additionalDirectory = Join-Path $OutputRoot 'portfolio\additional-work'
$additionalImages = @()
for ($index = 0; $index -lt $additionalFiles.Count; $index++) {
  $additionalImages += New-ImageRecord -File $additionalFiles[$index] -DestinationDirectory $additionalDirectory -UrlDirectory 'assets/optimized/portfolio/additional-work' -Index ($index + 1) -ClientTitle 'Additional Work' -FolderTitle 'Design Collection'
}
$clients += [ordered]@{
  id = 'additional-work'
  title = 'Additional Work'
  imageCount = $additionalImages.Count
  directImageCount = $additionalImages.Count
  preview = $additionalImages[0]
  images = $additionalImages
  children = @()
  type = 'Independent design collection'
  description = 'Additional identity and campaign work preserved from the root of the original portfolio archive.'
}

$totalImages = 0
foreach ($client in $clients) { $totalImages += [int]$client['imageCount'] }

$manifest = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  totalImages = $totalImages
  clients = $clients
}
$json = $manifest | ConvertTo-Json -Depth 30
$javascript = "export const portfolio = $json;`n"
[IO.File]::WriteAllText((Resolve-Path (Split-Path -Parent $ManifestPath)).Path + '\' + (Split-Path -Leaf $ManifestPath), $javascript, (New-Object Text.UTF8Encoding($false)))

Write-Output ("Portfolio manifest written to {0} with {1} images across {2} collections" -f $ManifestPath, $manifest.totalImages, $clients.Count)
