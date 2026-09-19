#Requires -Version 5.1
<#
.SYNOPSIS
  Export Mariner and Necromancer board artwork and interaction geometry via PowerPoint-native SVG.

.DESCRIPTION
  DEV TOOL only. Requires local Windows Microsoft PowerPoint.

  The original PPTX is copied to a throwaway file and is never written back.
  Board art lives on custom layouts:
    - Mariner: custom layout 7 (ONE_COLUMN_TEXT), used by slide 14
    - Necromancer: custom layout 4 (SECTION_HEADER), used by slide 5

  Export uses ShapeRange.Export(..., 6) which is PowerPoint's native SVG
  writer (ppShapeFormatSVG). Slide.Export("SVG") is not available.

  Layout shapes are exported in place. Curved connectors are not regrouped.

  Interaction sprites copy PowerPoint-native path geometry from the full-board
  SVG, identified by an EXPLICIT Draft-4.26.04 source-object mapping
  (shape index + name + type + bounds + connector begin/end). Application IDs
  are never inferred from printed labels.

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
$shapeDir = Join-Path $workDir "interaction-shapes"
New-Item -ItemType Directory -Force -Path $shapeDir | Out-Null

$BoundTol = 0.61

# Explicit Draft-4.26.04 mapping. Application IDs are assigned here, not read from art.
$MarinerIsles = @(
  @{ Id = "ishana"; Index = 3; Name = "Google Shape;272;p31"; Type = 6; Left = 424.52; Top = 249.29; Width = 132.9; Height = 164.94; Fill = "9CCBF9" }
  @{ Id = "tahv"; Index = 4; Name = "Google Shape;281;p31"; Type = 1; Auto = 9; Left = 430.65; Top = 413.52; Width = 16.1; Height = 31.17; Fill = "9CCBF9" }
  @{ Id = "halcyon_isles"; Index = 5; Name = "Google Shape;282;p31"; Type = 6; Left = 325.41; Top = 329.11; Width = 64.3; Height = 48.15; Fill = "9999EA" }
  @{ Id = "spyrholm"; Index = 6; Name = "Google Shape;288;p31"; Type = 6; Left = 161.4; Top = 389.33; Width = 35.59; Height = 31.65; Fill = "F4C2A4" }
  @{ Id = "izor"; Index = 7; Name = "Google Shape;291;p31"; Type = 1; Auto = 9; Left = 623.23; Top = 324.25; Width = 8.65; Height = 9.39; Fill = "A8D7B6" }
  @{ Id = "scuttleport"; Index = 8; Name = "Google Shape;292;p31"; Type = 6; Left = 510.46; Top = 126.32; Width = 82.99; Height = 42.95; Fill = "BDA6D5" }
  @{ Id = "far_reach"; Index = 9; Name = "Google Shape;299;p31"; Type = 6; Left = 197.21; Top = 132.73; Width = 31.61; Height = 87.71; Fill = "7DC493" }
  @{ Id = "orrery"; Index = 20; Name = "Google Shape;314;p31"; Type = 1; Auto = 9; Left = 220.24; Top = 296.66; Width = 9.17; Height = 12.35; Fill = "A8D7B6" }
  @{ Id = "druntyr"; Index = 22; Name = "Google Shape;318;p31"; Type = 1; Auto = 9; Left = 416.55; Top = 152.16; Width = 9.19; Height = 12.33; Fill = "A8D7B6" }
  @{ Id = "yeraine"; Index = 26; Name = "Google Shape;322;p31"; Type = 1; Auto = 9; Left = 406.72; Top = 541.1; Width = 16.1; Height = 13.46; Fill = "A8D7B6" }
  @{ Id = "koire"; Index = 27; Name = "Google Shape;323;p31"; Type = 1; Auto = 9; Left = 121.23; Top = 261.79; Width = 14; Height = 10.66; Fill = "A8D7B6" }
  @{ Id = "graven_isle"; Index = 41; Name = "Google Shape;327;p31"; Type = 1; Auto = 9; Left = 545.25; Top = 459.16; Width = 16.1; Height = 13.46; Fill = "CCCCCC" }
  @{ Id = "sage_atoll"; Index = 55; Name = "Google Shape;316;p31"; Type = 1; Auto = 9; Left = 273.31; Top = 504.78; Width = 14; Height = 10.66; Fill = "99E5FF" }
  @{ Id = "thyras"; Index = 76; Name = "Google Shape;310;p31"; Type = 1; Auto = 9; Left = 374.01; Top = 70.9; Width = 9.19; Height = 12.33; Fill = "A8D7B6" }
  @{ Id = "caravesse"; Index = 78; Name = "Google Shape;353;p31"; Type = 1; Auto = 9; Left = 313.95; Top = 251.5; Width = 9.17; Height = 12.35; Fill = "A8D7B6" }
)

$MarinerRoutes = @(
  @{ Id = "ishana__tahv"; Index = 10; Name = "Google Shape;304;p31"; Type = 1; Auto = -2; Left = 453.14; Top = 383.02; Width = 31.63; Height = 38.48; Begin = "Google Shape;278;p31"; End = "Google Shape;281;p31" }
  @{ Id = "ishana__scuttleport"; Index = 11; Name = "Google Shape;305;p31"; Type = 1; Auto = -2; Left = 485.01; Top = 203.91; Width = 94.02; Height = 36.54; Begin = "Google Shape;280;p31"; End = "Google Shape;296;p31" }
  @{ Id = "izor__scuttleport"; Index = 12; Name = "Google Shape;306;p31"; Type = 1; Auto = -2; Left = 526.04; Top = 222.74; Width = 148.42; Height = 54.97; Begin = "Google Shape;291;p31"; End = "Google Shape;296;p31" }
  @{ Id = "ishana__izor"; Index = 13; Name = "Google Shape;307;p31"; Type = 1; Auto = -2; Left = 577.55; Top = 285.58; Width = 15.87; Height = 77.5; Begin = "Google Shape;291;p31"; End = "Google Shape;280;p31" }
  @{ Id = "izor__ur"; Index = 14; Name = "Google Shape;308;p31"; Type = 1; Auto = -2; Left = 661.21; Top = 298.43; Width = 1.18; Height = 59.48; Begin = "Google Shape;291;p31"; End = "" }
  @{ Id = "scuttleport__thyras"; Index = 15; Name = "Google Shape;309;p31"; Type = 1; Auto = -2; Left = 383.98; Top = 76.28; Width = 135.59; Height = 45.21; Begin = "Google Shape;294;p31"; End = "Google Shape;310;p31" }
  @{ Id = "far_reach__thyras"; Index = 16; Name = "Google Shape;311;p31"; Type = 1; Auto = -2; Left = 233.41; Top = 73.82; Width = 141.94; Height = 66.33; Begin = "Google Shape;310;p31"; End = "Google Shape;300;p31" }
  @{ Id = "nebelheim__thyras"; Index = 17; Name = "Google Shape;312;p31"; Type = 1; Auto = -2; Left = 364.79; Top = 32.41; Width = 18.17; Height = 40.3; Begin = "Google Shape;310;p31"; End = "" }
  @{ Id = "orrery__spyrholm"; Index = 18; Name = "Google Shape;313;p31"; Type = 1; Auto = -2; Left = 165.12; Top = 327.38; Width = 78.07; Height = 41.34; Begin = "Google Shape;314;p31"; End = "Google Shape;290;p31" }
  @{ Id = "sage_atoll__spyrholm"; Index = 19; Name = "Google Shape;315;p31"; Type = 1; Auto = -2; Left = 187.2; Top = 422.32; Width = 89.95; Height = 83.95; Begin = "Google Shape;289;p31"; End = "Google Shape;316;p31" }
  @{ Id = "far_reach__orrery"; Index = 21; Name = "Google Shape;317;p31"; Type = 1; Auto = -2; Left = 170.87; Top = 242.7; Width = 92.69; Height = 15.21; Begin = "Google Shape;302;p31"; End = "Google Shape;314;p31" }
  @{ Id = "druntyr__thyras"; Index = 23; Name = "Google Shape;319;p31"; Type = 1; Auto = -2; Left = 377.82; Top = 82.44; Width = 47.69; Height = 71.53; Begin = "Google Shape;310;p31"; End = "Google Shape;318;p31" }
  @{ Id = "druntyr__ishana"; Index = 24; Name = "Google Shape;320;p31"; Type = 1; Auto = -2; Left = 420.36; Top = 163.71; Width = 58.94; Height = 94.68; Begin = "Google Shape;318;p31"; End = "Google Shape;276;p31" }
  @{ Id = "druntyr__scuttleport"; Index = 25; Name = "Google Shape;321;p31"; Type = 1; Auto = -2; Left = 426.54; Top = 151.58; Width = 98.83; Height = 5.95; Begin = "Google Shape;298;p31"; End = "Google Shape;318;p31" }
  @{ Id = "tahv__yeraine"; Index = 28; Name = "Google Shape;324;p31"; Type = 1; Auto = -2; Left = 373.07; Top = 470.81; Width = 107.34; Height = 35.31; Begin = "Google Shape;281;p31"; End = "Google Shape;322;p31" }
  @{ Id = "sage_atoll__yeraine"; Index = 29; Name = "Google Shape;325;p31"; Type = 1; Auto = -2; Left = 333.63; Top = 466.68; Width = 27.07; Height = 123.83; Begin = "Google Shape;316;p31"; End = "Google Shape;322;p31" }
  @{ Id = "graven_isle__izor"; Index = 30; Name = "Google Shape;326;p31"; Type = 1; Auto = -2; Left = 528.88; Top = 362.64; Width = 127.68; Height = 69.31; Begin = "Google Shape;327;p31"; End = "Google Shape;291;p31" }
  @{ Id = "koire__spyrholm"; Index = 31; Name = "Google Shape;328;p31"; Type = 1; Auto = -2; Left = 91.22; Top = 314.02; Width = 118.94; Height = 35.01; Begin = "Google Shape;290;p31"; End = "Google Shape;323;p31" }
  @{ Id = "far_reach__koire"; Index = 32; Name = "Google Shape;329;p31"; Type = 1; Auto = -2; Left = 138.9; Top = 210.09; Width = 46.37; Height = 60.14; Begin = "Google Shape;303;p31"; End = "Google Shape;323;p31" }
  @{ Id = "druj_lands__koire"; Index = 33; Name = "Google Shape;330;p31"; Type = 1; Auto = -2; Left = 73.68; Top = 258.84; Width = 49.61; Height = 3.33; Begin = "Google Shape;323;p31"; End = "" }
  @{ Id = "hecares__yeraine"; Index = 34; Name = "Google Shape;331;p31"; Type = 1; Auto = -2; Left = 414.15; Top = 555.22; Width = 1.28; Height = 38.79; Begin = "Google Shape;322;p31"; End = "" }
  @{ Id = "graven_isle__ishana"; Index = 42; Name = "Google Shape;338;p31"; Type = 1; Auto = -2; Left = 481.03; Top = 393.62; Width = 73.75; Height = 59.41; Begin = "Google Shape;278;p31"; End = "Google Shape;327;p31" }
  @{ Id = "graven_isle__yeraine"; Index = 43; Name = "Google Shape;339;p31"; Type = 1; Auto = -2; Left = 411.59; Top = 465.23; Width = 134.31; Height = 85.58; Begin = "Google Shape;340;p31"; End = "Google Shape;327;p31" }
  @{ Id = "caravesse__halcyon_isles"; Index = 56; Name = "Google Shape;352;p31"; Type = 1; Auto = -2; Left = 318.54; Top = 263.85; Width = 9; Height = 81.07; Begin = "Google Shape;285;p31"; End = "Google Shape;353;p31" }
  @{ Id = "halcyon_isles__ishana"; Index = 57; Name = "Google Shape;354;p31"; Type = 1; Auto = -2; Left = 382.1; Top = 350.06; Width = 34.51; Height = 11.31; Begin = "Google Shape;284;p31"; End = "Google Shape;277;p31" }
  @{ Id = "halcyon_isles__spyrholm"; Index = 58; Name = "Google Shape;355;p31"; Type = 1; Auto = -2; Left = 190.19; Top = 375.23; Width = 161.76; Height = 44.1; Begin = "Google Shape;286;p31"; End = "Google Shape;289;p31" }
  @{ Id = "halcyon_isles__tahv"; Index = 72; Name = "Google Shape;368;p31"; Type = 1; Auto = -2; Left = 382.91; Top = 373.31; Width = 42; Height = 58.2; Begin = "Google Shape;287;p31"; End = "Google Shape;281;p31" }
  @{ Id = "caravesse__orrery"; Index = 79; Name = "Google Shape;373;p31"; Type = 1; Auto = -2; Left = 229.41; Top = 257.68; Width = 84.54; Height = 45.17; Begin = "Google Shape;353;p31"; End = "Google Shape;314;p31" }
  @{ Id = "caravesse__far_reach"; Index = 80; Name = "Google Shape;374;p31"; Type = 1; Auto = -2; Left = 225.1; Top = 163.12; Width = 94.49; Height = 85.89; Begin = "Google Shape;353;p31"; End = "Google Shape;300;p31" }
  @{ Id = "caravesse__druntyr"; Index = 81; Name = "Google Shape;375;p31"; Type = 1; Auto = -2; Left = 321.67; Top = 159.21; Width = 94.2; Height = 93.99; Begin = "Google Shape;353;p31"; End = "Google Shape;318;p31" }
)

$NecromancerGates = @(
  @{ Id = "bronze"; Index = 2; Name = "Google Shape;129;p28"; Type = 1; Auto = 84; Left = 169.13; Top = 101.22; Width = 84.17; Height = 62.46 }
  @{ Id = "lead"; Index = 3; Name = "Google Shape;130;p28"; Type = 1; Auto = 84; Left = 267.16; Top = 101.22; Width = 84.17; Height = 62.46 }
  @{ Id = "amber"; Index = 5; Name = "Google Shape;132;p28"; Type = 1; Auto = 84; Left = 71.11; Top = 101.22; Width = 84.17; Height = 62.46 }
  @{ Id = "ivory"; Index = 7; Name = "Google Shape;134;p28"; Type = 1; Auto = 84; Left = 365.19; Top = 101.22; Width = 84.17; Height = 62.46 }
  @{ Id = "marching"; Index = 10; Name = "Google Shape;137;p28"; Type = 1; Auto = 84; Left = 120.13; Top = 223.4; Width = 84.17; Height = 62.46 }
  @{ Id = "churning"; Index = 12; Name = "Google Shape;139;p28"; Type = 1; Auto = 84; Left = 218.15; Top = 223.4; Width = 84.17; Height = 62.46 }
  @{ Id = "weeping"; Index = 14; Name = "Google Shape;141;p28"; Type = 1; Auto = 84; Left = 316.18; Top = 223.4; Width = 84.17; Height = 62.46 }
  @{ Id = "deep"; Index = 16; Name = "Google Shape;143;p28"; Type = 1; Auto = 84; Left = 169.14; Top = 353.75; Width = 84.17; Height = 62.46 }
  @{ Id = "terminus"; Index = 18; Name = "Google Shape;145;p28"; Type = 1; Auto = 84; Left = 236.54; Top = 484.1; Width = 84.17; Height = 62.46 }
  @{ Id = "antimony"; Index = 73; Name = "Google Shape;200;p28"; Type = 1; Auto = 84; Left = 463.21; Top = 101.22; Width = 84.17; Height = 62.46 }
  @{ Id = "howling"; Index = 75; Name = "Google Shape;202;p28"; Type = 1; Auto = 84; Left = 414.2; Top = 223.4; Width = 84.17; Height = 62.46 }
)

$NecromancerPaths = @(
  @{ Id = "edge_sage"; Index = 54; Name = "Google Shape;181;p28"; Type = 1; Auto = 9; Left = 78.52; Top = 61.69; Width = 11.15; Height = 11.15 }
  @{ Id = "edge_hierophant"; Index = 55; Name = "Google Shape;182;p28"; Type = 1; Auto = 9; Left = 135.03; Top = 61.69; Width = 11.15; Height = 11.15 }
  @{ Id = "edge_warlock"; Index = 57; Name = "Google Shape;184;p28"; Type = 1; Auto = 9; Left = 233.43; Top = 61.69; Width = 11.15; Height = 11.15 }
  @{ Id = "edge_mariner"; Index = 59; Name = "Google Shape;186;p28"; Type = 1; Auto = 9; Left = 333.72; Top = 61.16; Width = 11.15; Height = 11.15 }
  @{ Id = "far_amber"; Index = 61; Name = "Google Shape;188;p28"; Type = 1; Auto = 9; Left = 126.32; Top = 188.22; Width = 11.15; Height = 11.15 }
  @{ Id = "far_bronze"; Index = 63; Name = "Google Shape;190;p28"; Type = 1; Auto = 9; Left = 226.62; Top = 187.69; Width = 11.15; Height = 11.15 }
  @{ Id = "far_lead"; Index = 64; Name = "Google Shape;191;p28"; Type = 1; Auto = 9; Left = 283.13; Top = 187.69; Width = 11.15; Height = 11.15 }
  @{ Id = "far_ivory"; Index = 66; Name = "Google Shape;193;p28"; Type = 1; Auto = 9; Left = 381.53; Top = 187.69; Width = 11.15; Height = 11.15 }
  @{ Id = "abyss_marching"; Index = 67; Name = "Google Shape;194;p28"; Type = 1; Auto = 9; Left = 177.38; Top = 314.22; Width = 11.15; Height = 11.15 }
  @{ Id = "abyss_churning"; Index = 68; Name = "Google Shape;195;p28"; Type = 1; Auto = 9; Left = 233.9; Top = 314.22; Width = 11.15; Height = 11.15 }
  @{ Id = "abyss_weeping_upper"; Index = 69; Name = "Google Shape;196;p28"; Type = 1; Auto = 9; Left = 344.88; Top = 334.73; Width = 11.15; Height = 11.15 }
  @{ Id = "abyss_weeping_lower"; Index = 70; Name = "Google Shape;197;p28"; Type = 1; Auto = 9; Left = 303.67; Top = 389.06; Width = 11.15; Height = 11.15 }
  @{ Id = "edge_faustian"; Index = 89; Name = "Google Shape;216;p28"; Type = 1; Auto = 9; Left = 432.11; Top = 61.16; Width = 11.15; Height = 11.15 }
  @{ Id = "edge_sorcerer"; Index = 91; Name = "Google Shape;218;p28"; Type = 1; Auto = 9; Left = 531.6; Top = 61.16; Width = 11.15; Height = 11.15 }
  @{ Id = "far_antimony"; Index = 93; Name = "Google Shape;220;p28"; Type = 1; Auto = 9; Left = 481.01; Top = 187.69; Width = 11.15; Height = 11.15 }
)

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

function Assert-Close([double]$actual, [double]$expected, [string]$label) {
  if ([math]::Abs($actual - $expected) -gt $BoundTol) {
    throw "Mapping mismatch ${label}: expected $expected got $actual"
  }
}

function Get-ConnectorName($shape, [string]$end) {
  try {
    if ($end -eq "begin") {
      if ($shape.ConnectorFormat.BeginConnected) { return [string]$shape.ConnectorFormat.BeginConnectedShape.Name }
    } else {
      if ($shape.ConnectorFormat.EndConnected) { return [string]$shape.ConnectorFormat.EndConnectedShape.Name }
    }
  } catch {}
  return ""
}

function Assert-MappedShape($shape, $spec, [string]$label) {
  if ([string]$shape.Name -ne $spec.Name) {
    throw "$label name: expected $($spec.Name) got $($shape.Name)"
  }
  if ([int]$shape.Type -ne [int]$spec.Type) {
    throw "$label type: expected $($spec.Type) got $([int]$shape.Type)"
  }
  if ($null -ne $spec.Auto) {
    if ([string]$shape.AutoShapeType -ne [string]$spec.Auto) {
      throw "$label AutoShapeType: expected $($spec.Auto) got $($shape.AutoShapeType)"
    }
  }
  Assert-Close ([double]$shape.Left) ([double]$spec.Left) "$label Left"
  Assert-Close ([double]$shape.Top) ([double]$spec.Top) "$label Top"
  Assert-Close ([double]$shape.Width) ([double]$spec.Width) "$label Width"
  Assert-Close ([double]$shape.Height) ([double]$spec.Height) "$label Height"
  if ($null -ne $spec.Fill) {
    $fill = ""
    try { $fill = "{0:X6}" -f $shape.Fill.ForeColor.RGB } catch {}
    if ($fill -ne $spec.Fill) {
      throw "$label fill: expected $($spec.Fill) got $fill"
    }
  }
  if ($spec.ContainsKey("Begin")) {
    $begin = Get-ConnectorName $shape "begin"
    $end = Get-ConnectorName $shape "end"
    if ($begin -ne $spec.Begin) { throw "$label begin: expected '$($spec.Begin)' got '$begin'" }
    if ($end -ne $spec.End) { throw "$label end: expected '$($spec.End)' got '$end'" }
  }
}

function Get-SvgAttr([string]$tag, [string]$name) {
  $pattern = $name + '="([^"]*)"'
  if ($tag -match $pattern) { return $Matches[1] }
  return ""
}

function Get-SvgPathTags([string]$svg) {
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($match in [regex]::Matches($svg, '<path\b[^>]*?/?>')) {
    $list.Add($match.Value) | Out-Null
  }
  return $list
}

function Normalize-InteractionPath([string]$pathTag) {
  $tag = $pathTag
  $tag = [regex]::Replace($tag, '\sfill="[^"]*"', ' fill="inherit"')
  $tag = [regex]::Replace($tag, '\sstroke="[^"]*"', ' stroke="inherit"')
  $tag = [regex]::Replace($tag, '\sstroke-width="[^"]*"', "")
  $tag = [regex]::Replace($tag, '\sstroke-dasharray="[^"]*"', "")
  $tag = [regex]::Replace($tag, '\sstroke-linejoin="[^"]*"', "")
  $tag = [regex]::Replace($tag, '\sstroke-miterlimit="[^"]*"', "")
  $tag = [regex]::Replace($tag, '\sstroke-linecap="[^"]*"', "")
  if ($tag -notmatch '\sfill=') {
    $tag = $tag -replace '<path\b', '<path fill="inherit"'
  }
  if ($tag -notmatch '\sstroke=') {
    $tag = $tag -replace '<path\b', '<path stroke="inherit"'
  }
  return $tag
}

function Find-FullBoardPath([string]$fullSvg, [string]$d, [string]$transform, [string]$label) {
  $hits = New-Object System.Collections.Generic.List[string]
  foreach ($tag in (Get-SvgPathTags $fullSvg)) {
    $tagD = Get-SvgAttr $tag "d"
    $tagT = Get-SvgAttr $tag "transform"
    if ($tagD -eq $d -and $tagT -eq $transform) {
      $hits.Add($tag) | Out-Null
    }
  }
  if ($hits.Count -ne 1) {
    $preview = $d
    if ($preview.Length -gt 48) { $preview = $preview.Substring(0, 48) }
    throw "${label}: expected exactly one full-board path for d='$preview' transform='$transform', got $($hits.Count). Refusing to guess."
  }
  return $hits[0]
}

function Export-MappedSymbol($layout, $spec, [string]$symbolId, [string]$fullSvg, [string]$innerTransform, [int]$boardW, [int]$boardH, [string]$kind) {
  $shape = $layout.Shapes.Item([int]$spec.Index)
  Assert-MappedShape $shape $spec $symbolId
  $exportPath = Join-Path $shapeDir ($symbolId + ".svg")
  if (Test-Path -LiteralPath $exportPath) { Remove-Item -LiteralPath $exportPath -Force }
  $shape.Export($exportPath, 6)
  if (-not (Test-Path -LiteralPath $exportPath)) {
    throw "Shape SVG export failed for $symbolId"
  }
  $exported = [System.IO.File]::ReadAllText($exportPath)
  $exportedPaths = @(Get-SvgPathTags $exported)
  if ($exportedPaths.Count -lt 1) {
    throw "$symbolId exported no path geometry"
  }
  $copied = New-Object System.Collections.Generic.List[string]
  foreach ($pathTag in $exportedPaths) {
    $d = Get-SvgAttr $pathTag "d"
    $transform = Get-SvgAttr $pathTag "transform"
    if ([string]::IsNullOrEmpty($d)) {
      throw "$symbolId exported a path without d"
    }
    $fullTag = Find-FullBoardPath $fullSvg $d $transform $symbolId
    $copied.Add("    " + (Normalize-InteractionPath $fullTag)) | Out-Null
  }
  $body = $copied -join "`n"
  return @"
  <symbol id="$symbolId" viewBox="0 0 $boardW $boardH" data-source-kind="$kind">
    <g transform="$innerTransform">
$body
    </g>
  </symbol>
"@
}

function Write-InteractionSprite([string]$path, [int]$width, [int]$height, [string[]]$symbols, [string]$boardName) {
  $joined = $symbols -join "`n"
  $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 $width $height" width="$width" height="$height">
  <!-- Generated by scripts/export-source-board-svgs.ps1 from Draft 4.26.04 $boardName. Do not edit. -->
$joined
</svg>
"@
  [System.IO.File]::WriteAllText($path, $svg)
}

function Get-SvgSize([string]$svg, [string]$attr) {
  if ($svg -match ("<" + "svg[^>]*" + $attr + '="(\d+)"')) {
    return [int]$Matches[1]
  }
  throw "Missing $attr on exported board SVG"
}

function Get-InnerTransform([string]$svg) {
  if ($svg -match '<g transform="([^"]+)">') {
    return $Matches[1]
  }
  throw "Missing inner group transform on exported board SVG"
}

function Assert-UniqueIds([string[]]$ids, [string]$label) {
  $dup = $ids | Group-Object | Where-Object { $_.Count -gt 1 }
  if ($dup) {
    throw "$label has duplicate semantic IDs: $($dup.Name -join ', ')"
  }
}

$ppt = $null
$pres = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.DisplayAlerts = 1
  $pres = $ppt.Presentations.Open($workPptx, $true, $false, $true)

  $marinerLayout = $pres.SlideMaster.CustomLayouts.Item(7)
  $gatesLayout = $pres.SlideMaster.CustomLayouts.Item(4)

  $marinerFile = Export-LayoutSvg $marinerLayout (Join-Path $OutDir "mariner-board.svg")
  $gatesFile = Export-LayoutSvg $gatesLayout (Join-Path $OutDir "necromancer-gates-board.svg")

  $marinerSvg = [System.IO.File]::ReadAllText($marinerFile.FullName)
  $gatesSvg = [System.IO.File]::ReadAllText($gatesFile.FullName)
  $marinerW = Get-SvgSize $marinerSvg "width"
  $marinerH = Get-SvgSize $marinerSvg "height"
  $gatesW = Get-SvgSize $gatesSvg "width"
  $gatesH = Get-SvgSize $gatesSvg "height"
  $marinerTransform = Get-InnerTransform $marinerSvg
  $gatesTransform = Get-InnerTransform $gatesSvg

  Assert-UniqueIds @($MarinerIsles | ForEach-Object { $_.Id }) "Mariner Isles"
  Assert-UniqueIds @($MarinerRoutes | ForEach-Object { $_.Id }) "Mariner Routes"
  Assert-UniqueIds @($NecromancerGates | ForEach-Object { $_.Id }) "Necromancer Gates"
  Assert-UniqueIds @($NecromancerPaths | ForEach-Object { $_.Id }) "Necromancer Paths"
  if ($MarinerIsles.Count -ne 15) { throw "Expected 15 Mariner Isles, got $($MarinerIsles.Count)" }
  if ($MarinerRoutes.Count -ne 30) { throw "Expected 30 Mariner Routes, got $($MarinerRoutes.Count)" }
  if ($NecromancerGates.Count -ne 11) { throw "Expected 11 Necromancer Gates, got $($NecromancerGates.Count)" }
  if ($NecromancerPaths.Count -ne 15) { throw "Expected 15 occupiable Necromancer paths, got $($NecromancerPaths.Count)" }

  $marinerSymbols = New-Object System.Collections.Generic.List[string]
  foreach ($spec in $MarinerIsles) {
    Write-Output "MAP mariner-isle-$($spec.Id) index=$($spec.Index)"
    $marinerSymbols.Add((Export-MappedSymbol $marinerLayout $spec ("mariner-isle-" + $spec.Id) $marinerSvg $marinerTransform $marinerW $marinerH "isle")) | Out-Null
  }
  foreach ($spec in $MarinerRoutes) {
    Write-Output "MAP mariner-route-$($spec.Id) index=$($spec.Index)"
    $marinerSymbols.Add((Export-MappedSymbol $marinerLayout $spec ("mariner-route-" + $spec.Id) $marinerSvg $marinerTransform $marinerW $marinerH "route")) | Out-Null
  }

  $gatesSymbols = New-Object System.Collections.Generic.List[string]
  foreach ($spec in $NecromancerGates) {
    Write-Output "MAP necromancer-gate-$($spec.Id) index=$($spec.Index)"
    $gatesSymbols.Add((Export-MappedSymbol $gatesLayout $spec ("necromancer-gate-" + $spec.Id) $gatesSvg $gatesTransform $gatesW $gatesH "gate")) | Out-Null
  }
  foreach ($spec in $NecromancerPaths) {
    Write-Output "MAP necromancer-path-$($spec.Id) index=$($spec.Index)"
    $gatesSymbols.Add((Export-MappedSymbol $gatesLayout $spec ("necromancer-path-" + $spec.Id) $gatesSvg $gatesTransform $gatesW $gatesH "path")) | Out-Null
  }

  $marinerGeom = Join-Path $OutDir "mariner-interaction-geometry.svg"
  $gatesGeom = Join-Path $OutDir "necromancer-interaction-geometry.svg"
  Write-InteractionSprite $marinerGeom $marinerW $marinerH $marinerSymbols.ToArray() "Mariner layout 7"
  Write-InteractionSprite $gatesGeom $gatesW $gatesH $gatesSymbols.ToArray() "Necromancer layout 4"

  Write-Output "MARINER_SVG=$($marinerFile.FullName) bytes=$($marinerFile.Length)"
  Write-Output "GATES_SVG=$($gatesFile.FullName) bytes=$($gatesFile.Length)"
  Write-Output "MARINER_GEOM=$marinerGeom"
  Write-Output "GATES_GEOM=$gatesGeom"
  Write-Output "SLIDE_WIDTH=$($pres.PageSetup.SlideWidth)"
  Write-Output "SLIDE_HEIGHT=$($pres.PageSetup.SlideHeight)"
  Write-Output "MARINER_SYMBOLS=$($marinerSymbols.Count)"
  Write-Output "GATES_SYMBOLS=$($gatesSymbols.Count)"
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
