[CmdletBinding()]
param(
    [AllowEmptyString()]
    [string]$RoomUrl,
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 / Windows 10 及以上；不需要 Node.js 或 Python。
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Get-LiveRoomId([string]$Address) {
    $addressText = $Address.Trim()
    # 仅接受桌面网页版完整房间地址；附加的 query/hash 在生成时移除。
    if ($addressText.Length -gt 4096 -or
        $addressText -notmatch '\Ahttps://live\.douyin\.com(?::443)?/[A-Za-z0-9_-]{1,80}/?(?:[?#][^\s]*)?\z') {
        throw '地址格式不正确。请复制浏览器地址栏中的 https://live.douyin.com/房间号，不要粘贴分享文案、短链接或个人主页。'
    }
    $roomUri = [Uri]$addressText
    if ($roomUri.Scheme -ne 'https' -or $roomUri.Host -ne 'live.douyin.com' -or
        $roomUri.UserInfo -or -not $roomUri.IsDefaultPort -or
        $roomUri.AbsolutePath -cnotmatch '\A/([A-Za-z0-9_-]{1,80})/?\z') {
        throw '请使用抖音桌面网页版直播间地址。'
    }
    return $Matches[1]
}

try {
    $interactive = -not $PSBoundParameters.ContainsKey('RoomUrl')
    if ($interactive) {
        Write-Host '直播间小助手 · 脚本生成工具' -ForegroundColor Cyan
        Write-Host '打开目标直播间，复制浏览器地址栏中的完整网址。'
        Write-Host '填写示例（碳眠无郎）：https://live.douyin.com/913594635641'
        Write-Host '请换成你要使用的直播间地址；输入 Q 可退出。'
        Write-Host ''
        while ($true) {
            $RoomUrl = Read-Host '请粘贴直播间地址，然后按回车'
            if ($RoomUrl.Trim() -ieq 'q') { exit 0 }
            try {
                $roomId = Get-LiveRoomId $RoomUrl
                break
            } catch {
                Write-Host $_.Exception.Message -ForegroundColor Yellow
            }
        }
    } else {
        $roomId = Get-LiveRoomId $RoomUrl
    }

    $templatePath = Join-Path $PSScriptRoot '直播间小助手.template.user.js'
    $template = [IO.File]::ReadAllText($templatePath, [Text.Encoding]::UTF8)
    $marker = '{{LIVE_ROOM_ID}}'
    if ([regex]::Matches($template, [regex]::Escape($marker)).Count -ne 3) {
        throw '模板的房间配置标记不完整，请使用随工具附带的原始模板。'
    }
    $generated = $template.Replace($marker, $roomId)
    if ($generated.Contains($marker)) { throw '生成失败：存在未替换的房间配置。' }

    if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
        $OutputDirectory = Join-Path $PSScriptRoot '已生成脚本'
    }
    $destination = [IO.Path]::GetFullPath($OutputDirectory)
    [void][IO.Directory]::CreateDirectory($destination)
    $suffix = (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $outputPath = Join-Path $destination ("直播间小助手-{0}-{1}.user.js" -f $roomId, $suffix)
    # CreateNew 保证任何情况下都不覆盖已有脚本；网址从未作为命令执行。
    $outputStream = [IO.File]::Open($outputPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try {
        $bytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes($generated)
        $outputStream.Write($bytes, 0, $bytes.Length)
    } finally {
        $outputStream.Dispose()
    }

    Write-Host ''
    Write-Host '生成成功！' -ForegroundColor Green
    Write-Host ("生效直播间：https://live.douyin.com/{0}" -f $roomId)
    Write-Host ("脚本位置：{0}" -f $outputPath)
    Write-Host '下一步：在油猴管理面板新建脚本，粘贴生成文件的全部内容并保存，再刷新直播间。'
    Write-Host '同一直播间只启用一份小助手；更换文件后请重新导入油猴。'
    Write-Output $outputPath
} catch {
    Write-Host ''
    Write-Host ("生成失败：{0}" -f $_.Exception.Message) -ForegroundColor Red
    exit 1
}
