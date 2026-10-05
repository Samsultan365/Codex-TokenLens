param(
  [switch]$Test
)

$ErrorActionPreference = "SilentlyContinue"

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$script:PluginDir = $null
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
  if ($env:CODEX_CLI_PATH) {
    $dir = Split-Path $env:CODEX_CLI_PATH -Parent
    $candidates += (Join-Path $dir "cua_node\bin\node.exe")
  }
  $candidates += (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
  if ($env:LOCALAPPDATA) {
    $runtimeRoot = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node"
    if (Test-Path $runtimeRoot) {
      foreach ($dir in (Get-ChildItem $runtimeRoot -Directory)) {
        $candidates += (Join-Path $dir.FullName "bin\node.exe")
      }
    }
  }

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) { return $node.Source }
  return $null
}

function Get-Snapshot {
  $node = Find-Node
  $pluginDir = Resolve-PluginDir
  if (-not $node -or -not $pluginDir) { return $null }
  $cli = Join-Path $pluginDir "mcp\cli.mjs"
  if (-not (Test-Path $cli)) { return $null }

  $raw = & $node $cli --json 2>$null | Out-String
  if (-not $raw) { return $null }
  try { return ($raw | ConvertFrom-Json) } catch { return $null }
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
  WindowStyle="None" AllowsTransparency="True" Background="Transparent"
  ResizeMode="NoResize" Topmost="True" ShowInTaskbar="False"
  Width="264" Height="96">
  <Border x:Name="Root" CornerRadius="14" Background="#E6101A2B" BorderBrush="#4C0F766E" BorderThickness="1" Padding="14,10">
    <Grid>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
      </Grid.RowDefinitions>
      <StackPanel Orientation="Horizontal">
        <TextBlock x:Name="TitleText" Text="Codex" Foreground="#F2F2F2" FontSize="12" FontWeight="SemiBold"/>
        <TextBlock x:Name="CloseText" Text="  ✕" Foreground="#8FA3B8" FontSize="12" HorizontalAlignment="Right" Cursor="Hand"/>
      </StackPanel>
      <TextBlock x:Name="UsageText" Grid.Row="1" Margin="0,6,0,0" Foreground="#DFE7EF" FontSize="11" Text="读取中…"/>
      <TextBlock x:Name="BalanceText" Grid.Row="2" Margin="0,4,0,0" Foreground="#5EEAD4" FontSize="12" FontWeight="SemiBold" Text="余额读取中…"/>
    </Grid>
  </Border>
</Window>
"@

  $reader = New-Object System.Xml.XmlNodeReader ([xml]$xaml)
  $window = [Windows.Markup.XamlReader]::Load($reader)

  $title = $window.FindName("TitleText")
  $close = $window.FindName("CloseText")
  $usageText = $window.FindName("UsageText")
  $balanceText = $window.FindName("BalanceText")
  $root = $window.FindName("Root")

  $settings = Read-Settings
  if ($settings) {
    try {
      $window.Left = [double]$settings.left
      $window.Top = [double]$settings.top
    } catch {}
  } else {
    $window.Left = [System.Windows.SystemParameters]::WorkArea.Right - $window.Width - 20
    $window.Top = 40
  }

  $root.Add_MouseLeftButtonDown({
    try { $window.DragMove() } catch {}
  })

  $close.Add_MouseLeftButtonUp({
    $_.Handled = $true
    Write-Settings $window
    $window.Close()
  })

  function Update-UI($data) {
    if (-not $data) {
      $usageText.Text = "读取失败"
      $balanceText.Text = "—"
      return
    }

    $platform = $data.platform
    $usage = $data.usage
    $balance = $data.balance

    $display = $platform.displayName
    if (-not $display) { $display = $platform.model }
    if (-not $display) { $display = "Codex" }
    $title.Text = "Codex · $display"

    if ($usage -and $usage.last) {
      $percent = 0.0
      if ($usage.last.contextPercent -ne $null) { $percent = [double]$usage.last.contextPercent }
      $used = if ($usage.last.inputTokens -ne $null) { [int64]$usage.last.inputTokens } else { 0 }
      $window = $usage.contextWindow
      $usageText.Text = "上下文 {0} / {1}  ({2:N1}%)" -f $used, $window, $percent
    } else {
      $usageText.Text = "暂无本地 token 数据"
    }

    if ($balance) {
      if ($balance.ok -and $balance.platform -eq "deepseek") {
        $balanceText.Text = "余额 {0} {1}" -f $balance.totalBalance, $balance.currency
      } elseif ($balance.ok -and $balance.platform -eq "openrouter") {
        $balanceText.Text = "Credits {0}" -f $balance.totalCredits
      } elseif ($balance.ok) {
        $balanceText.Text = "账户有效"
      } else {
        $balanceText.Text = "余额不可用"
      }
    } else {
      $balanceText.Text = "余额不可用"
    }
  }

  $timer = New-Object System.Windows.Threading.DispatcherTimer
  $timer.Interval = [TimeSpan]::FromSeconds(10)
  $timer.Add_Tick({
    $data = Get-Snapshot
    Update-UI $data
    Write-Settings $window
  })
  $timer.Start()

  $data = Get-Snapshot
  Update-UI $data
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
