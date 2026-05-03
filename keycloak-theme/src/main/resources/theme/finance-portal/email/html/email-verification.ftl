<#import "../template.ftl" as layout>
<@layout.emailLayout previewText=msg("emailVerificationPreview") title=msg("emailVerificationHeading") ctaLink=link ctaLabel=msg("emailVerificationCta")>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#111111;">${msg("emailVerificationIntro", realmName)}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("emailVerificationExpire", linkExpirationFormatter(linkExpiration))}</p>
    <p style="margin:0;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("emailVerificationIgnore")}</p>
</@layout.emailLayout>
