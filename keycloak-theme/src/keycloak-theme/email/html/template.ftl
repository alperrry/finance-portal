<#--
  This file has been claimed for ownership from @keycloakify/email-native version 260007.0.0.
  To relinquish ownership and restore this file to its original content, run the following command:
  
  $ npx keycloakify own --path "email/html/template.ftl" --revert
-->

<#macro emailLayout>
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!'tr'}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Finance Portal</title>
</head>
<body style="margin:0;padding:0;background:#f7f6f2;font-family:Arial,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f6f2;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid rgba(17,17,17,0.10);">
                <tr>
                    <td style="padding:28px 32px;background:#111111;color:#ffffff;">
                        <div style="font-size:11px;letter-spacing:0;text-transform:uppercase;color:rgba(255,255,255,0.64);font-weight:700;">${msg("fpEmailEyebrow")}</div>
                        <div style="margin-top:14px;font-size:22px;line-height:1.25;font-weight:800;">Finance Portal</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px;font-size:14px;line-height:1.75;color:#111111;">
                        <#nested>
                    </td>
                </tr>
                <tr>
                    <td style="padding:20px 32px;background:#111111;color:rgba(255,255,255,0.78);">
                        <div style="font-size:12px;font-weight:700;">&copy; ${.now?string("yyyy")} Finance Portal</div>
                        <div style="margin-top:6px;font-size:12px;line-height:1.7;color:rgba(255,255,255,0.56);">${msg("fpEmailFooter")}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
</#macro>
