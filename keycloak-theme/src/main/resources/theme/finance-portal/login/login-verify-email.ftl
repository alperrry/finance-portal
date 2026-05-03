<#import "template.ftl" as layout>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayInfo=true; section>
    <#if section = "header">
        ${msg("emailVerifyTitle")}
    <#elseif section = "form">
        <div class="fp-copy-block">
            <p class="instruction">
                <#if verifyEmail??>
                    ${msg("emailVerifyInstruction1", verifyEmail)}
                <#else>
                    ${msg("emailVerifyInstruction4", user.email)}
                </#if>
            </p>
        </div>

        <#if isAppInitiatedAction??>
            <form id="kc-verify-email-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
                <@buttons.actionGroup>
                    <#if verifyEmail??>
                        <@buttons.button id="kc-resend" label="emailVerifyResend" class=["kcButtonSecondaryClass"] />
                    <#else>
                        <@buttons.button id="kc-send" label="emailVerifySend" class=["kcButtonPrimaryClass"] />
                    </#if>
                    <@buttons.button id="kc-cancel" label="doCancel" name="cancel-aia" class=["kcButtonSecondaryClass"] />
                </@buttons.actionGroup>
            </form>
        </#if>
    <#elseif section = "info">
        <#if !isAppInitiatedAction??>
            <p class="instruction">
                ${msg("emailVerifyInstruction2")}
                <br/>
                <a href="${url.loginAction}">${msg("doClickHere")}</a> ${msg("emailVerifyInstruction3")}
            </p>
        </#if>
    </#if>
</@layout.registrationLayout>
