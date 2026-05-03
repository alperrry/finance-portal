<#import "../template.ftl" as layout>
<@layout.emailLayout previewText=msg("emailUpdatePreview", newEmail) title=msg("emailUpdateHeading") ctaLink=link ctaLabel=msg("emailUpdateCta")>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#111111;">${msg("emailUpdateIntro", newEmail, realmName)}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("emailUpdateExpire", linkExpirationFormatter(linkExpiration))}</p>
    <p style="margin:0;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("emailUpdateIgnore")}</p>
</@layout.emailLayout>
