<#macro emailLayout previewText="" title="" ctaLink="" ctaLabel="">
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!'tr'}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#edeae4;font-family:'Sora',Arial,sans-serif;color:#111111;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${previewText}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edeae4;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#f7f5f1;border-radius:24px;overflow:hidden;border:1px solid rgba(17,17,17,0.09);box-shadow:0 16px 48px rgba(17,17,17,0.08);">
                <tr>
                    <td style="padding:32px;background:#0e0e0e;background-image:linear-gradient(165deg,#090909 0%,#0c0c0c 36%,#14110d 100%);color:#ffffff;">
                        <div style="font-family:'JetBrains Mono',Courier,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.58);">${msg("fpEmailEyebrow")}</div>
                        <div style="margin-top:16px;display:flex;align-items:center;gap:12px;">
                            <span style="display:inline-flex;width:42px;height:42px;border-radius:14px;align-items:center;justify-content:center;background:#c1622f;color:#ffffff;font-size:22px;line-height:1;">◈</span>
                            <div>
                                <div style="font-size:14px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Finance Portal</div>
                                <div style="margin-top:6px;font-size:26px;line-height:1.15;font-weight:700;">${title}</div>
                            </div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px;">
                        <#nested>
                        <#if ctaLink?has_content>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;margin-bottom:24px;">
                                <tr>
                                    <td style="border-radius:999px;background:#c1622f;">
                                        <a href="${ctaLink}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:999px;">${ctaLabel}</a>
                                    </td>
                                </tr>
                            </table>
                        </#if>
                        <p style="margin:0 0 8px;font-size:12px;line-height:1.75;color:rgba(17,17,17,0.62);">${msg("fpEmailFallback")}</p>
                        <p style="margin:0;padding:14px 16px;border-radius:16px;background:#ffffff;border:1px solid rgba(17,17,17,0.09);font-family:'JetBrains Mono',Courier,monospace;font-size:12px;line-height:1.7;word-break:break-all;color:#111111;">${ctaLink}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:20px 32px;background:#111111;color:rgba(255,255,255,0.78);">
                        <div style="font-size:12px;font-weight:700;">&copy; ${.now?string("yyyy")} Finance Portal</div>
                        <div style="margin-top:6px;font-size:12px;line-height:1.7;color:rgba(255,255,255,0.52);">${msg("fpEmailFooter")}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
</#macro>
