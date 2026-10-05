param(
  [switch]$Test
)

$ErrorActionPreference = "SilentlyContinue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [Console]::OutputEncoding

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

if (-not ("CodexUsageWidget.NativeMethods" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class CodexUsageWidget_NativeMethods {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
}

$script:PluginDir = $null
$script:DebugLog = Join-Path $env:USERPROFILE ".codex\codex-usage-widget-debug.log"
$script:SettingsPath = Join-Path $env:USERPROFILE ".codex\codex-usage-widget.json"

function Resolve-PluginDir {
  if ($script:PluginDir) { return $script:PluginDir }
  $repo = Join-Path $PSScriptRoot "..\plugins\codex-usage-panel"
  if (Test-Path (Join-Path $repo "mcp\cli.mjs")) {
    $script:PluginDir = (Resolve-Path $repo).Path
    return $script:PluginDir
  }
  $cacheRoot = Join-Path $env:USERPROFILE ".codex\plugins\cache\codex-usage-panel-marketplace\codex-usage-panel"
  if (Test-Path $cacheRoot) {
    $latest = Get-ChildItem $cacheRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if ($latest -and (Test-Path (Join-Path $latest.FullName "mcp\cli.mjs"))) {
      $script:PluginDir = $latest.FullName
      return $script:PluginDir
    }
  }
  return $null
}

function Find-Node {
  $candidates = @()
  if ($env:CODEX_MCP_NODE_PATH) { $candidates += $env:CODEX_MCP_NODE_PATH }
  if ($env:CODEX_BROWSER_USE_NODE_PATH) { $candidates += $env:CODEX_BROWSER_USE_NODE_PATH }
  if ($env:CODEX_ELECTRON_RESOURCES_PATH) { $candidates += (Join-Path $env:CODEX_ELECTRON_RESOURCES_PATH "cua_node\bin\node.exe") }
  if ($env:CODEX_CLI_PATH) { $candidates += (Join-Path (Split-Path $env:CODEX_CLI_PATH -Parent) "cua_node\bin\node.exe") }
  $candidates += (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
  if ($env:LOCALAPPDATA) {
    $runtimeRoot = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node"
    if (Test-Path $runtimeRoot) {
      foreach ($dir in (Get-ChildItem $runtimeRoot -Directory)) { $candidates += (Join-Path $dir.FullName "bin\node.exe") }
    }
  }
  foreach ($candidate in $candidates) { if ($candidate -and (Test-Path $candidate)) { return $candidate } }
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) { return $node.Source }
  return $null
}

function Write-Log($message) {
  try {
    Add-Content -Path $script:DebugLog -Value ("[{0}] {1}" -f (Get-Date -Format o), $message) -Encoding UTF8
  } catch {}
}

function Get-Snapshot {
  $node = Find-Node
  $pluginDir = Resolve-PluginDir
  if (-not $node -or -not $pluginDir) {
    Write-Log "missing node/plugin: node=$node plugin=$pluginDir"
    return $null
  }
  $cli = Join-Path $pluginDir "mcp\cli.mjs"
  if (-not (Test-Path $cli)) {
    Write-Log "missing cli: $cli"
    return $null
  }
  $raw = & $node $cli --json 2>&1 | Out-String
  $exit = $LASTEXITCODE
  if (-not $raw) {
    Write-Log "empty output exit=$exit cli=$cli node=$node"
    return $null
  }
  try { return ($raw | ConvertFrom-Json) } catch {
    Write-Log "parse error: $($_.Exception.Message) head=$($raw.Substring(0, [Math]::Min(300, $raw.Length)))"
    return $null
  }
}

function Read-Settings {
  if (Test-Path $script:SettingsPath) {
    try { return (Get-Content -Raw $script:SettingsPath | ConvertFrom-Json) } catch {}
  }
  return $null
}

function Write-Settings($window) {
  try {
    $settings = [ordered]@{ left = $window.Left; top = $window.Top }
    $json = $settings | ConvertTo-Json -Compress
    New-Item -ItemType Directory -Force -Path (Split-Path $script:SettingsPath -Parent) | Out-Null
    [System.IO.File]::WriteAllText($script:SettingsPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  } catch {}
}

function Shorten-Text($text, [int]$max = 18) {
  if (-not $text) { return "当前对话" }
  if ($text.Length -le $max) { return $text }
  return $text.Substring(0, $max) + "…"
}

function Get-CodexRect {
  $codex = Get-Process Codex -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
  if (-not $codex) { return $null }

  $rect = New-Object CodexUsageWidget_NativeMethods+RECT
  if ([CodexUsageWidget_NativeMethods]::GetWindowRect($codex.MainWindowHandle, [ref]$rect)) {
    return [ordered]@{ Left=$rect.Left; Top=$rect.Top; Right=$rect.Right; Bottom=$rect.Bottom }
  }
  return $null
}

function Move-NextToCodex($window) {
  $rect = Get-CodexRect
  if (-not $rect) { return }
  $screenRight = [System.Windows.SystemParameters]::WorkArea.Right
  $desiredLeft = [double]$rect.Right + 8
  if (($desiredLeft + $window.Width) -le $screenRight) {
    $window.Left = $desiredLeft
  } else {
    $window.Left = [double]$rect.Right - $window.Width - 12
  }
  $window.Top = [double]$rect.Top + 12
}

function Show-Widget {
  $pluginDir = Resolve-PluginDir
  $node = Find-Node
  if (-not $pluginDir -or -not $node) {
    [System.Windows.MessageBox]::Show("找不到 codex-usage-panel 插件或 Node 运行时。", "Codex Usage Widget")
    return
  }

  $xaml = @"
<Window
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  FontFamily="Segoe UI"
  WindowStyle="None" AllowsTransparency="True" Background="Transparent"
  ResizeMode="NoResize" Topmost="True" ShowInTaskbar="False"
  Width="300" Height="108">
  <Border x:Name="Root" CornerRadius="14" Background="#F2101A2B" BorderBrush="#5C0F766E" BorderThickness="1" Padding="16,12">
    <Grid>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
      </Grid.RowDefinitions>
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>
      <TextBlock x:Name="ThreadText" Grid.Column="0" Text="当前对话" Foreground="#9FB3C8" FontSize="12" TextTrimming="CharacterEllipsis" Margin="0,0,4,0"/>
      <TextBlock x:Name="CloseText" Grid.Column="1" Text="✕" Foreground="#8FA3B8" FontSize="13" Cursor="Hand" VerticalAlignment="Top" Margin="6,-2,0,0"/>
      <TextBlock x:Name="UsageText" Grid.Row="1" Grid.ColumnSpan="2" Margin="0,6,0,0" Foreground="#FFFFFF" FontSize="15" FontWeight="SemiBold" Text="已用 token 读取中…"/>
      <TextBlock x:Name="BalanceText" Grid.Row="2" Grid.ColumnSpan="2" Margin="0,4,0,0" Foreground="#5EEAD4" FontSize="13" Text="余额读取中…"/>
    </Grid>
  </Border>
</Window>
"@

  $reader = New-Object System.Xml.XmlNodeReader ([xml]$xaml)
  $window = [Windows.Markup.XamlReader]::Load($reader)
  $threadText = $window.FindName("ThreadText")
  $usageText = $window.FindName("UsageText")
  $balanceText = $window.FindName("BalanceText")
  $close = $window.FindName("CloseText")
  $root = $window.FindName("Root")

  $settings = Read-Settings
  if ($settings) {
    try {
      $window.Left = [double]$settings.left
      $window.Top = [double]$settings.top
    } catch {}
  } else {
    Move-NextToCodex $window
    if ($window.Left -le 0) {
      $window.Left = [System.Windows.SystemParameters]::WorkArea.Right - $window.Width - 20
      $window.Top = 40
    }
  }

  $root.Add_MouseLeftButtonDown({ try { $window.DragMove() } catch {} })
  $close.Add_MouseLeftButtonUp({
    $_.Handled = $true
    Write-Settings $window
    $window.Close()
  })

  function Update-UI($data) {
    if (-not $data) {
      $threadText.Text = "当前对话"
      $usageText.Text = "读取失败"
      $balanceText.Text = "余额不可用"
      return
    }

    $usage = $data.usage
    $balance = $data.balance

    $threadText.Text = Shorten-Text $usage.threadName 18

    $used = 0
    if ($usage.total -and $usage.total.totalTokens -ne $null) { $used = [int64]$usage.total.totalTokens }
    elseif ($usage.last -and $usage.last.totalTokens -ne $null) { $used = [int64]$usage.last.totalTokens }

    $percent = 0.0
    if ($usage.last -and $usage.last.contextPercent -ne $null) { $percent = [double]$usage.last.contextPercent }

    $usageText.Text = "已用 {0:N0} token · 上下文 {1:N0}%" -f $used, $percent

    if ($balance -and $balance.ok -and $balance.platform -eq "deepseek") {
      $balanceText.Text = "余额 ¥{0}" -f $balance.totalBalance
    } elseif ($balance -and $balance.ok -and $balance.platform -eq "openrouter") {
      $balanceText.Text = "余额 {0} credits" -f $balance.totalCredits
    } elseif ($balance -and $balance.ok) {
      $balanceText.Text = "余额：账户有效"
    } else {
      $balanceText.Text = "余额不可用"
    }
  }

  $timer = New-Object System.Windows.Threading.DispatcherTimer
  $timer.Interval = [TimeSpan]::FromSeconds(8)
  $timer.Add_Tick({
    $data = Get-Snapshot
    Update-UI $data
    Move-NextToCodex $window
    Write-Settings $window
  })
  $timer.Start()

  $data = Get-Snapshot
  Update-UI $data
  Move-NextToCodex $window
  Write-Settings $window

  [void]$window.ShowDialog()
}

if ($Test) {
  $node = Find-Node
  $pluginDir = Resolve-PluginDir
  $snapshot = Get-Snapshot
  [ordered]@{
    node = $node
    pluginDir = $pluginDir
    snapshot = $snapshot
  } | ConvertTo-Json -Depth 12
} else {
  Show-Widget
}




