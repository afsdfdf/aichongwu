$boundary = [System.Guid]::NewGuid().ToString('N')
$filePath = 'C:\Users\changcheng\Downloads\OIP-C.webp'
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)
$lf = "`r`n"
$parts = New-Object System.Collections.Generic.List[byte]
function Add-TextPart([string]$name, [string]$value) {
  $script:parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("--$boundary$lf"))
  $script:parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("Content-Disposition: form-data; name=\"$name\"$lf$lf"))
  $script:parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("$value$lf"))
}
Add-TextPart 'model' 'gpt-image-2'
Add-TextPart 'prompt' 'Use this uploaded image as the source subject and generate a clean memorial-style preview. Preserve the identity of the main subject.'
Add-TextPart 'size' '1024x1024'
Add-TextPart 'n' '1'
$parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("--$boundary$lf"))
$parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("Content-Disposition: form-data; name=\"image\"; filename=\"$fileName\"$lf"))
$parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("Content-Type: image/webp$lf$lf"))
$parts.AddRange($fileBytes)
$parts.AddRange([System.Text.Encoding]::UTF8.GetBytes($lf))
$parts.AddRange([System.Text.Encoding]::UTF8.GetBytes("--$boundary--$lf"))
$bodyPath = 'D:\AI生图项目\ai-shopify-preview\.tmp-gpt2-edits.bin'
[System.IO.File]::WriteAllBytes($bodyPath, $parts.ToArray())
curl.exe -sS -D - -x http://127.0.0.1:7892 https://ai403.eu.cc/v1/images/edits -H "Authorization: Bearer sk-IFxwtkzeia3yarebq2F6AXK5GVhXFReLmgGmj15c8IkKyKlk" -H "Content-Type: multipart/form-data; boundary=$boundary" --data-binary "@$bodyPath"
