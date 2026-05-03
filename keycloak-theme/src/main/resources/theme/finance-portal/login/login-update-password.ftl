<#import "template.ftl" as layout>
<#import "password-commons.ftl" as passwordCommons>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError("password", "password-confirm"); section>
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <form id="kc-passwd-update-form" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" novalidate="novalidate">
            <@field.password name="password-new" label=msg("passwordNew") fieldName="password" autocomplete="new-password" autofocus=true />
            <@field.password name="password-confirm" label=msg("passwordConfirm") autocomplete="new-password" />

            <div class="${properties.kcFormGroupClass!}">
                <@passwordCommons.logoutOtherSessions/>
            </div>

            <@buttons.actionGroup>
                <#if isAppInitiatedAction??>
                    <@buttons.button id="kc-submit" name="login" label="doSubmit" class=["kcButtonPrimaryClass"] />
                    <@buttons.button id="kc-cancel" label="doCancel" name="cancel-aia" class=["kcButtonSecondaryClass"] />
                <#else>
                    <@buttons.button id="kc-submit" name="login" label="doSubmit" class=["kcButtonPrimaryClass", "kcButtonBlockClass"] />
                </#if>
            </@buttons.actionGroup>
        </form>
    </#if>
</@layout.registrationLayout>
