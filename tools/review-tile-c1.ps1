$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = Split-Path -Parent $PSScriptRoot
$folder = Join-Path $project 'artifacts/procedural-tiles-c1'
$cases = Get-Content -LiteralPath (Join-Path $folder 'preview-cases.json') -Raw | ConvertFrom-Json -Depth 100
$bitmap = [System.Drawing.Bitmap]::new(1260, 1430)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$font = [System.Drawing.Font]::new('Segoe UI', 11)
$titleFont = [System.Drawing.Font]::new('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
$panelFont = [System.Drawing.Font]::new('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#203944'))
$fill = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#4b91a2'))
$accent = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d38b35'))
$outline = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#183a48'), 2)
$border = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#d7ddd9'), 1)
$grid = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#e6e9e3'), 1)
function Rat($value) { return [double]::Parse($value[0], [System.Globalization.CultureInfo]::InvariantCulture) / [double]::Parse($value[1], [System.Globalization.CultureInfo]::InvariantCulture) }
try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f7f6ef'))
    $graphics.DrawString('C1 / regularized planar evidence', $titleFont, $ink, 32, 20)
    $graphics.DrawString('Native XY metres. Diagnostic projection of exact rational evidence; no mesh or gameplay adoption.', $font, $ink, 34, 68)
    for ($i = 0; $i -lt $cases.Count; $i++) {
        $case = $cases[$i]
        $result = $case.result
        $x = 28 + ($i % 3) * 410
        $y = 110 + [math]::Floor($i / 3) * 424
        $graphics.DrawRectangle($border, [single]$x, [single]$y, 390, 404)
        $graphics.DrawString($case.name, $panelFont, $ink, [single]($x + 14), [single]($y + 12))
        $graphics.DrawString($result.resolution.state, $font, $ink, [single]($x + 14), [single]($y + 42))
        $left = $x + 34
        $top = $y + 85
        for ($j = 0; $j -le 6; $j++) {
            $graphics.DrawLine($grid, [single]($left + $j * 52), [single]$top, [single]($left + $j * 52), [single]($top + 260))
            $graphics.DrawLine($grid, [single]$left, [single]($top + $j * 43), [single]($left + 312), [single]($top + $j * 43))
        }
        if ($null -eq $result.geometry) {
            $graphics.DrawString('UNRESOLVED', $panelFont, $accent, [single]($x + 100), [single]($y + 185))
            $graphics.DrawString('Source retained; no partial footprint.', $font, $ink, [single]($x + 45), [single]($y + 225))
            $graphics.DrawString($result.resolution.diagnostics[0].code, $font, $ink, [single]($x + 14), [single]($y + 367))
            continue
        }
        $g = $result.geometry
        if ($g.vertices.Count -eq 0) {
            $graphics.DrawString('RESOLVED EMPTY', $panelFont, $ink, [single]($x + 76), [single]($y + 180))
            $graphics.DrawString('0 geometry / 0 query ghosts', $font, $ink, [single]($x + 73), [single]($y + 222))
        } else {
            $points = @{}
            foreach ($v in $g.vertices) { $points[$v.id] = @((Rat $v.point[0]), (Rat $v.point[1])) }
            $xs = @($points.Values | ForEach-Object { $_[0] })
            $ys = @($points.Values | ForEach-Object { $_[1] })
            $minX = ($xs | Measure-Object -Minimum).Minimum
            $maxX = ($xs | Measure-Object -Maximum).Maximum
            $minY = ($ys | Measure-Object -Minimum).Minimum
            $maxY = ($ys | Measure-Object -Maximum).Maximum
            $scale = [math]::Min(296 / ($maxX - $minX), 246 / ($maxY - $minY))
            $offsetX = $left + (312 - ($maxX - $minX) * $scale) / 2
            $offsetY = $top + (260 - ($maxY - $minY) * $scale) / 2
            $screen = @{}
            foreach ($v in $g.vertices) { $p = $points[$v.id]; $screen[$v.id] = [System.Drawing.PointF]::new([single]($offsetX + ($p[0] - $minX) * $scale), [single]($offsetY + ($maxY - $p[1]) * $scale)) }
            $edges = @{}
            foreach ($e in $g.edges) { $edges[$e.id] = $e }
            $path = [System.Drawing.Drawing2D.GraphicsPath]::new([System.Drawing.Drawing2D.FillMode]::Winding)
            try {
                foreach ($walk in $g.contours | Where-Object side -eq 'occupied') {
                    $polygon = [System.Drawing.PointF[]]@($walk.spans | ForEach-Object { $e = $edges[$_.id]; if ($_.direction -eq 1) { $screen[$e.from] } else { $screen[$e.to] } })
                    $path.AddPolygon($polygon)
                }
                $graphics.FillPath($fill, $path)
                $graphics.DrawPath($outline, $path)
            } finally { $path.Dispose() }
            foreach ($incidence in $g.incidence | Where-Object touching) { $p = $screen[$incidence.vertex]; $graphics.FillEllipse($accent, [single]($p.X - 4), [single]($p.Y - 4), 8, 8) }
        }
        $area = (Rat $g.area).ToString('0.########', [System.Globalization.CultureInfo]::InvariantCulture)
        $caption = 'Area ' + $area + ' m2   /   interiors ' + $g.components.Count + '   /   voids ' + $g.voids.Count
        $graphics.DrawString($caption, $font, $ink, [single]($x + 14), [single]($y + 367))
    }
    $graphics.DrawString('Orange marks exact touching incidence. Independent Fraction tests establish topology; this plot does not.', $font, $ink, 34, 1390)
    $bitmap.Save((Join-Path $folder 'footprint-review.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    foreach ($resource in @($graphics, $bitmap, $font, $titleFont, $panelFont, $ink, $fill, $accent, $outline, $border, $grid)) { $resource.Dispose() }
}
@{status='pass';output='footprint-review.png';cleanup='All task-owned GDI resources disposed in finally. Foreground only; no server, browser, watcher, worker or port.'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'preview-receipt.json')
Get-Content -LiteralPath (Join-Path $folder 'preview-receipt.json') -Raw
