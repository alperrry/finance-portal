<#import "../template.ftl" as layout>
<@layout.emailLayout previewText=msg("passwordResetPreview") title=msg("passwordResetHeading") ctaLink=link ctaLabel=msg("passwordResetCta")>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#111111;">${msg("passwordResetIntro", realmName)}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("passwordResetExpire", linkExpirationFormatter(linkExpiration))}</p>
    <p style="margin:0;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("passwordResetIgnore")}</p>
</@layout.emailLayout>
