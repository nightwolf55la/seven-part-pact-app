#Requires -Version 5.1
<#
.SYNOPSIS
  Export Mariner and Necromancer board artwork via PowerPoint-native SVG.

.DESCRIPTION
  DEV TOOL only. Requires local Windows Microsoft PowerPoint.

  The original PPTX is copied to a throwaway file and is never written back.
  Board art lives on custom layouts:
    - Mariner: custom layout 7 (ONE_COLUMN_TEXT), used by slide 14
    - Necromancer: custom layout 4 (SECTION_HEADER), used by slide 5

  Export uses ShapeRange.Export(..., 6) which is PowerPoint's native SVG
  writer (ppShapeFormatSVG). Slide.Export("SVG") is not available.

  Layout shapes are exported in place. Curved connectors are not regrouped.

.PARAMETER SourcePptx
  Path to Patreon Materials [04.26.04].pptx.

.PARAMETER OutDir
  Directory for SVG outputs. Defaults to src/assets/source-boards.
#>
param(
  [string]$SourcePptx = (Join-Path $env:USERPROFILE "Downloads\Patreon Materials [04.26.04].pptx"),
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $OutDir) {
  $repoRoot = Split-Path -Parent $PSScriptRoot
  $OutDir = Join-Path $repoRoot "src\assets\source-boards"
}

if (-not (Test-Path -LiteralPath $SourcePptx)) {
  throw "Source PPTX not found: $SourcePptx"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$workDir = Join-Path $env:TEMP "spp-pptx-extract"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
$workPptx = Join-Path $workDir "materials-export.pptx"
Copy-Item -LiteralPath $SourcePptx -Destination $workPptx -Force

function Hide-PageNumberShapes($layout) {
  for ($i = $layout.Shapes.Count; $i -ge 1; $i--) {
    $shape = $layout.Shapes.Item($i)
    $text = ""
    try {
      if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
        $text = $shape.TextFrame.TextRange.Text
      }
    } catch {}
    if ($text -match "<#>") {
      $shape.Visible = 0
    }
  }
}

function Repair-ExportedSvg([string]$path) {
  $svg = [System.IO.File]::ReadAllText($path)
  $serif = "Georgia, &quot;Times New Roman&quot;, Times, serif"
  $svg = $svg -replace 'font-family="[^"]*MSFontService[^"]*"', "font-family=`"$serif`""
  $svg = $svg -replace 'font-family="Arial,Arial_MSFontService,sans-serif"', "font-family=`"$serif`""
  $svg = $svg -replace '<text[^>]*>‹#›</text>', ""
  $svg = $svg -replace '<text[^>]*>&lt;#&gt;</text>', ""
  [System.IO.File]::WriteAllText($path, $svg)
}

function Export-LayoutSvg($layout, [string]$path) {
  if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
  Hide-PageNumberShapes $layout
  $layout.Shapes.Range().Export($path, 6)
  if (-not (Test-Path -LiteralPath $path)) {
    throw "PowerPoint native SVG export failed for $path"
  }
  Repair-ExportedSvg $path
  return (Get-Item -LiteralPath $path)
}

$ppt = $null
$pres = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.DisplayAlerts = 1
  $pres = $ppt.Presentations.Open($workPptx, $true, $false, $true)

  $marinerFile = Export-LayoutSvg $pres.SlideMaster.CustomLayouts.Item(7) (Join-Path $OutDir "mariner-board.svg")
  $gatesFile = Export-LayoutSvg $pres.SlideMaster.CustomLayouts.Item(4) (Join-Path $OutDir "necromancer-gates-board.svg")

  Write-Output "MARINER_SVG=$($marinerFile.FullName) bytes=$($marinerFile.Length)"
  Write-Output "GATES_SVG=$($gatesFile.FullName) bytes=$($gatesFile.Length)"
  Write-Output "SLIDE_WIDTH=$($pres.PageSetup.SlideWidth)"
  Write-Output "SLIDE_HEIGHT=$($pres.PageSetup.SlideHeight)"
}
finally {
  if ($null -ne $pres) {
    $pres.Saved = $true
    $pres.Close()
  }
  if ($null -ne $ppt) {
    $ppt.Quit()
  }
}
