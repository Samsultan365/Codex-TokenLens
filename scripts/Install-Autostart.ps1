param(
  [switch]$Remove
)
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $scriptDir "..\widget\Launch-Widget.vbs"
$vbs = (Resolve-Path $vbs).Path
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Codex TokenLens.lnk"

if ($Remove) {
  if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
    Write-Output "已移除开机启动：$shortcutPath"
  } else {
    Write-Output "未找到开机启动项：$shortcutPath"
  }
  exit 0
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = '"' + $vbs + '"'
$shortcut.WorkingDirectory = Split-Path $vbs -Parent
$shortcut.Description = "Codex TokenLens always-on-top usage widget"
$shortcut.Save()

Write-Output "已设置开机启动：$shortcutPath"
