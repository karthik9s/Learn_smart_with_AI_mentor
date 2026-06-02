$repoPath = "c:\Users\karth\OneDrive\Dokumen\LearningWithAi"
Set-Location $repoPath

$status = git status --porcelain
if ($status) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git add -A
    git commit -m "auto: sync changes [$timestamp]"
    git push
    Write-Host "[$timestamp] Committed and pushed changes."
} else {
    Write-Host "[$(Get-Date -Format 'HH:mm')] No changes to commit."
}
