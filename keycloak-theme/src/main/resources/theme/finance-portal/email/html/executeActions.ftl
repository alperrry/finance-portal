<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>

<#import "../template.ftl" as layout>
<@layout.emailLayout previewText=msg("executeActionsPreview") title=msg("executeActionsHeading") ctaLink=link ctaLabel=msg("executeActionsCta")>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#111111;">${msg("executeActionsIntro", realmName, requiredActionsText)}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("executeActionsExpire", linkExpirationFormatter(linkExpiration))}</p>
    <p style="margin:0;font-size:14px;line-height:1.8;color:rgba(17,17,17,0.72);">${msg("executeActionsIgnore")}</p>
</@layout.emailLayout>
