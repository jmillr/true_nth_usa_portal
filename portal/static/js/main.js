/*** Portal specific javascript. Topnav.js is separate and will be used across domains. **/

var userSetLang = 'en_US';// FIXME scope? defined in both tnth.js/banner and main.js
var DELAY_LOADING = false;

function equalHeightBoxes(passClass) {
    var windowsize = $(window).width();
    // Switch back to auto for small screen or to recalculate on larger
    $('.'+passClass).css("height","auto");
    if (windowsize > 768 && $('.'+passClass).length > 1) {
        var elementHeights = $('.'+passClass).map(function() {
            return $(this).height();
        }).get();
        // Math.max takes a variable number of arguments
        // `apply` is equivalent to passing each height as an argument
        var maxHeight = Math.max.apply(null, elementHeights);
        // Set each height to the max height
        $('.'+passClass).height(maxHeight);
    }
}
// Return an XHR without XHR header so  it doesn't need to be explicitly allowed with CORS
function xhr_function(){
    // Get new xhr object using default factory
    var xhr = jQuery.ajaxSettings.xhr();
    // Copy the browser's native setRequestHeader method
    var setRequestHeader = xhr.setRequestHeader;
    // Replace with a wrapper
    xhr.setRequestHeader = function(name, value) {
        // Ignore the X-Requested-With header
        if (name == 'X-Requested-With') return;
        // Otherwise call the native setRequestHeader method
        // Note: setRequestHeader requires its 'this' to be the xhr object,
        // which is what 'this' is here when executed.
        setRequestHeader.call(this, name, value);
    };
    // pass it on to jQuery
    return xhr;
}
// AJAX callback
function embed_page(data){
    $("#mainNav")
        // Embed data returned by AJAX call into container element
        .html(data);
        loader();
}
function showMain() {
    $("#mainHolder").css({
                          "visibility" : "visible",
                          "-ms-filter": "progid:DXImageTransform.Microsoft.Alpha(Opacity=100)",
                          "filter": "alpha(opacity=100)",
                          "-moz-opacity": 1,
                          "-khtml-opacity": 1,
                          "opacity": 1
                        });

}
// Loading indicator that appears in UI on page loads and when saving
var loader = function(show) {
    //landing page
    if ($("#fullSizeContainer").length > 0) {
        $("#loadingIndicator").hide();
        showMain();
        return false;
    };

    if (show) {
        $("#loadingIndicator").show();
    } else {
        setTimeout("showMain();", 100);
        if (!DELAY_LOADING) {
            setTimeout('$("#loadingIndicator").fadeOut();', 200);
        };
    };
};
var SNOMED_SYS_URL = "http://snomed.info/sct", CLINICAL_SYS_URL = "http://us.truenth.org/clinical-codes";
var CANCER_TREATMENT_CODE = "118877007", NONE_TREATMENT_CODE = "999";
var CONSENT_ENUM = {
    "consented": {
        "staff_editable": true,
        "include_in_reports": true,
        "send_reminders": true
    },
     "suspended": {
        "staff_editable": true,
        "include_in_reports": true,
        "send_reminders": false
    },
    "purged": {
        "staff_editable": false,
        "include_in_reports": false,
        "send_reminders": false
    }
};
var SYSTEM_IDENTIFIER_ENUM = {
    "external_study_id" : "http://us.truenth.org/identity-codes/external-study-id",
    "external_site_id" : "http://us.truenth.org/identity-codes/external-site-id",
    "practice_region" : "http://us.truenth.org/identity-codes/practice-region"
};
var __NOT_PROVIDED_TEXT = "not provided";
var fillViews = {
    "org": function() {
        var content = "";
        //find if top level org first
        var topLevelOrgs = $("#fillOrgs legend[data-checked]");
        if (topLevelOrgs.length > 0) {
            topLevelOrgs.each(function() {
                content += "<p class='capitalize'>" + i18next.t($(this).text()) + "</p>";
            });
        };
        $("#userOrgs input[name='organization']").each(function() {
            if ($(this).is(":checked")) {
                if ($(this).val() == "0") content += "<p>" + i18next.t("No affiliated clinic") + "</p>";
                else content += "<p>" + i18next.t($(this).closest("label").text()) + "</p>";
            };
        });
        if (!hasValue(content)) content = "<p class='text-muted'>" + i18next.t("No clinic selected") + "</p>";
        $("#userOrgs_view").html(content);
    },
    "demo":function() {
        this.name();
        this.dob();
        this.studyId();
        this.siteId();
        this.phone();
        this.altPhone();
        this.email();
        this.deceased();
        this.locale();
        this.timezone();
        this.detail();
    },
    "name": function() {
        if (!$("#firstNameGroup").hasClass("has-error") && !$("#lastNameGroup").hasClass("has-error")) {
            var content = $("#firstname").val() + " " + $("#lastname").val();
            if (hasValue($.trim(content))) $("#name_view").text(content);
            else $("#name_view").html("<p class='text-muted'></p>");
        };
    },
    "dob": function() {
        if (!$("#bdGroup").hasClass("has-error")) {
            if (hasValue($.trim($("#month option:selected").val()+$("#year").val()+$("#date").val()))) {
                var displayString = tnthDates.displayDateString($("#month option:selected").val(), $("#date").val(), $("#year").val());
                $("#dob_view").text(i18next.t(displayString));
            } else $("#dob_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
    },
    "phone": function() {
        if (!$("#phoneGroup").hasClass("has-error")) {
            var content = $("#phone").val();
            if (hasValue(content)) $("#phone_view").text(content);
            else $("#phone_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
    },
    "altPhone": function() {
        if (!$("#altPhoneGroup").hasClass("has-error")) {
            var content = $("#altPhone").val();
            if (hasValue(content)) $("#alt_phone_view").text(content);
            else $("#alt_phone_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
    },
    "email": function() {
        if (!$("#emailGroup").hasClass("has-error")) {
            var content = $("#email").val();
            if (hasValue(content)) $("#email_view").text(content);
            else $("#email_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
    },
    "studyId": function() {
        if (!$("#profileStudyIDContainer").hasClass("has-error")) {
            var content = $("#profileStudyId").val();
            if (hasValue(content)) $("#study_id_view").text(content);
            else $("#study_id_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
    },
    "siteId": function() {
        if (!$("#profileSiteIDContainer").hasClass("has-error")) {
            var content = $("#profileSiteId").val();
            if (hasValue(content)) $("#site_id_view").text(content);
            else $("#site_id_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
    },
    "detail": function() {
        this.gender();
        this.race();
        this.ethnicity();
        this.indigenous();
    },
    "gender": function() {
        if ($("#genderGroup").length > 0) {
            if (!$("#genderGroup").hasClass("has-error")) {
                var content = $("input[name=sex]:checked").val();
                if (hasValue(content)) $("#gender_view").html("<p class='capitalize'>" + i18next.t(content) + "</p>");
                else $("#gender_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
            };
        } else $(".gender-view").hide();
    },
    "race": function() {
        if ($("#userRace").length > 0) {
            if (!$("#userRace").hasClass("has-error")) {
                var content = "";
                $("#userRace input:checkbox").each(function() {
                    if ($(this).is(":checked")) content += "<p>" + i18next.t($(this).closest("label").text()) + "</p>";
                })
                if (hasValue(content)) $("#race_view").html($.trim(content));
                else $("#race_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
            };
        } else {
            $(".race-view").hide();
        };
    },
    "ethnicity": function() {
        if ($("#userEthnicity").length > 0) {
            if (!$("#userEthnicity").hasClass("has-error")) {
                var content = "";
                $("#userEthnicity input[type='radio']").each(function() {
                    if ($(this).is(":checked")) content += "<p>" + i18next.t($(this).closest("label").text()) + "</p>";
                })
                if (hasValue(content)) $("#ethnicity_view").html($.trim(content));
                else $("#ethnicity_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
            };
        } else $(".ethnicity-view").hide();
    },
    "indigenous": function() {
        if ($("#userIndigenousStatus").length > 0) {
            if (!$("#userIndigenousStatus").hasClass("has-error")) {
                var content = "";
                $("#userIndigenousStatus input[type='radio']").each(function() {
                    if ($(this).is(":checked")) content += "<p>" + i18next.t($(this).next("label").text()) + "</p>";
                })
                if (hasValue($.trim(content))) $("#indigenous_view").html($.trim(content));
                else $("#indigenous_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
            };
        } else $(".indigenous-view").hide();
    },
    "clinical": function() {
        var content = "";
        if (!$("#biopsyDateContainer").hasClass("has-error")) {
            var a = $("#patBiopsy input[name='biopsy']:checked").val();
            var biopsyDate = $("#biopsyDate").val();
            if (a == "true" && hasValue(biopsyDate)) {
                var displayDate = "";
                if (hasValue($.trim($("#biopsy_month option:selected").val()+$("#biopsy_year").val()+$("#biopsy_day").val()))) {
                    displayDate = tnthDates.displayDateString($("#biopsy_month option:selected").val(), $("#biopsy_day").val(), $("#biopsy_year").val());
                };
                if (!hasValue(displayDate)) displayDate = __NOT_PROVIDED_TEXT;
                content = $("#patBiopsy input[name='biopsy']:checked").closest("label").text();
                content += "&nbsp;&nbsp;" + displayDate;
            } else content = $("#patBiopsy input[name='biopsy']:checked").closest("label").text();
            if (hasValue(content)) $("#biopsy_view").html("<div>" + i18next.t(content) + "</div>");
            else $("#biopsy_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        };
        content = $("#patDiag input[name='pca_diag']:checked").closest("label").text();
        if (hasValue(content)) $("#pca_diag_view").html("<div>" + i18next.t(content) + "</div>");
        else $("#pca_diag_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        content = $("#patMeta input[name='pca_localized']:checked").closest("label").text();
        if (hasValue(content)) $("#pca_localized_view").html("<div>" + i18next.t(content) + "</div>");
        else $("#pca_localized_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
    },
    "deceased": function() {
        if ($("#boolDeath").is(":checked")) {
            $("#boolDeath_view").text(i18next.t("Patient is deceased"));
            if (hasValue($("#deathDate").val()) && !$("#deathDayContainer").hasClass("has-error") && !$("#deathMonthContainer").hasClass("has-error") && !$("#deathYearContainer").hasClass("has-error")) {
                var displayString = tnthDates.displayDateString($("#deathMonth").val(), $("#deathDay").val(),$("#deathYear").val());
                $("#deathDate_view").text(i18next.t(displayString));
            };
        } else $("#boolDeath_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
    },
    "locale": function() {
        if ($("#locale").length > 0) {
            var content = $("#locale option:selected").text();
            if (hasValue(content)) $("#locale_view").text(i18next.t(content));
            else $("#locale_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");

        } else $(".locale-view").hide();
    },
    "timezone": function() {
        if ($("#profileTimeZone").length > 0) {
            var content = $("#profileTimeZone").find("option:selected").val();
            if (hasValue(content)) $("#timezone_view").text(i18next.t(content));
            else $("#timezone_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        } else $(".timezone-view").hide();
    },
    "procedure": function() {
        if ($("#userProcedures").length > 0) {
            var content = "";
            $("#userProcedures tr[data-id]").each(function() {
                $(this).find("td").each(function() {
                    if (!$(this).hasClass("list-cell") && !$(this).hasClass("lastCell")) content += "<div style='line-height:1.5em'>" + i18next.t($(this).text()) + "</div>";
                });
            });
            if (hasValue(content)) $("#procedure_view").html(content);
            else $("#procedure_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
        } else $("#procedure_view").html("<p class='text-muted'>" + __NOT_PROVIDED_TEXT + "</p>");
    }
};
var fillContent = {
    "clinical": function(data) {
        $.each(data.entry, function(i,val){
            var clinicalItem = val.content.code.coding[0].display;
            var clinicalValue = val.content.valueQuantity.value;
            //console.log(clinicalItem + " " + clinicalValue + " issued: " + val.content.issued + " last updated: " + val.content.meta.lastUpdated + " " + (new Date(val.content.meta.lastUpdated.replace(/\-/g, "/").replace("T", " ")).getTime()))
            var status = val.content.status;
            if (clinicalItem == "PCa diagnosis") {
                clinicalItem = "pca_diag";
            } else if (clinicalItem == "PCa localized diagnosis") {
                clinicalItem = "pca_localized";
            };
            var ci = $('div[data-topic="'+clinicalItem+'"]');
            if (ci.length > 0) ci.fadeIn().next().fadeIn();
            var $radios = $('input:radio[name="'+clinicalItem+'"]');
            if ($radios.length > 0) {
                if(!$radios.is(':checked')) {
                    if (status == "unknown") $radios.filter('[data-status="unknown"]').prop('checked', true);
                    else $radios.filter('[value='+clinicalValue+']').not("[data-status='unknown']").prop('checked', true);
                    if (clinicalItem == "biopsy") {
                        if (clinicalValue == "true") {
                            if (hasValue(val.content.issued)) {
                                var issuedDate = "";
                                var dString = tnthDates.formatDateString(val.content.issued, "iso-short");
                                var dArray = dString.split("-");
                                $("#biopsyDate").val(dString);
                                $("#biopsy_year").val(dArray[0]);
                                $("#biopsy_month").val(dArray[1]);
                                $("#biopsy_day").val(dArray[2]);
                                $("#biopsyDateContainer").show();
                                $("#biopsyDate").removeAttr("skipped");
                            };
                        } else {
                            $("#biopsyDate").val("");
                            $("#biopsyDateContainer").hide();
                            $("#biopsyDate").attr("skipped", "true");
                        };
                    };
                    if (clinicalItem == "pca_diag") {
                        if ($("#pca_diag_no").is(":checked")) {
                            $("#tx_yes").attr("skipped", "true");
                            $("#tx_no").attr("skipped", "true");
                        } else {
                            $("#tx_yes").removeAttr("skipped");
                            $("#tx_no").removeAttr("skipped");
                        };
                    }
                };
            };
        });
        fillViews.clinical();
    },
    "demo": function(data) {
        //console.log("in demo");
        //console.log(data)
        $('#firstname').val(data.name.given);
        $('#lastname').val(data.name.family);
        if (data.birthDate) {
            var bdArray = data.birthDate.split("-");
            $("#birthday").val(data.birthDate);
            $("#year").val(bdArray[0]);
            $("#month").val(bdArray[1]);
            $("#date").val(bdArray[2]);
        };
        if (data.deceasedDateTime) {
            if(hasValue(data.deceasedDateTime)) {
                var dArray = (data.deceasedDateTime.split("T"))[0].split("-");
                $("#deathYear").val(dArray[0]);
                $("#deathMonth").val(dArray[1]);
                $("#deathDay").val(dArray[2]);
                $("#deathDate").val(dArray[0] + "-" + dArray[1] + "-" + dArray[2]);
                $("#boolDeath").prop("checked", true);
            } else {
                $("#deathYear").val("");
                $("#deathMonth").val("");
                $("#deathDay").val("");
                $("#deathDate").val("");
                $("#boolDeath").prop("checked", false);
            };
        }

        if (data.deceasedBoolean) {
            if (String(data.deceasedBoolean).toLowerCase() == "true") {
                $("#boolDeath").prop("checked", true);
            } else $("#boolDeath").prop("checked", false);
        };

        fillViews.demo();
        // TODO - add email and phone for profile page use
        // Only on profile page
        this.ethnicity(data);
        // Get Races
        this.race(data);
        this.indigenous(data);
        this.orgs(data);
        tnthAjax.getOptionalCoreData(OT.getUserId(), false, $(".profile-item-container[data-sections='detail']"));
    },
    "name": function(data){
        if (data && data.name) {
            $('#firstname').val(data.name.given);
            $('#lastname').val(data.name.family);
        };
        fillViews.name();
    },
    "dob": function(data) {
        if (data && data.birthDate) {
            var bdArray = data.birthDate.split("-");
            $("#birthday").val(data.birthDate);
            $("#year").val(bdArray[0]);
            $("#month").val(bdArray[1]);
            $("#date").val(bdArray[2]);
        };
        fillViews.dob();
    },
    "language": function(data) {
        if (data.communication) {
            data.communication.forEach(function(item) {
                if (item.language && item.language.coding) {
                    var selected = false;
                    if (item.language.coding.length > 0) {
                        $("#locale").find("option").each(function() {
                             $(this).removeAttr("selected");
                        });
                    };
                    item.language.coding.forEach(function(l) {
                        //select the first available language
                        if (!selected) {
                            var option = $("#locale").find("option[value='" + l.code + "']");
                            if (option.length > 0) {
                                $("#locale").find("option[value='" + l.code + "']").attr("selected", "selected");
                                $("#locale").get(0).value = l.code;
                                selected = true;
                            };
                        };
                    });
                };
            });
        };
        fillViews.locale();
    },
    "ethnicity": function(data) {
        data.extension.forEach(function(item, index) {
            if (item.url === "http://hl7.org/fhir/StructureDefinition/us-core-ethnicity") {
                //console.log(item)
                item.valueCodeableConcept.coding.forEach(function(val){
                    $("#userEthnicity input:radio[value="+val.code+"]").prop('checked', true);
                    // Way to handle non-standard codes - output but hide, for submitting on update
                    if ($("#userEthnicity input:radio[value="+val.code+"]").length == 0) {
                        if (val.code !== "undefined") $("#userEthnicity").append("<input class='tnth-hide' type='checkbox' checked name='ethnicity' value='"+val.code+"' data-label='"+val.display+"' />");
                    }
                });
            };
        });
        fillViews.ethnicity();
    },
    "race": function(data) {
        // Get Races
        data.extension.forEach(function(item, index) {
            if (item.url === "http://hl7.org/fhir/StructureDefinition/us-core-race") {
                item.valueCodeableConcept.coding.forEach(function(val){
                    //console.log(val)
                    $("#userRace input:checkbox[value="+val.code+"]").prop('checked', true);
                    // Way to handle non-standard codes
                    if ($("#userRace input:checkbox[value="+val.code+"]").length == 0) {
                        // If there is any non-standard, then check the "other" in the UI
                        $("#userRace input:checkbox[value=2131-1]").prop('checked', true);
                        // Add hidden list of non-standard for form submission
                       if (val.code !== "undefined") $("#userRace").append("<input class='tnth-hide' type='checkbox' checked name='race' value='"+val.code+"' data-label='"+val.display+"' />");
                        //$("#raceOtherVal").fadeToggle();
                    }
                });
            };
        });
        fillViews.race();
    },
    "indigenous": function(data) {
        data.extension.forEach(function(item, index) {
            if (item.url === "http://us.truenth.org/fhir/StructureDefinition/AU-NHHD-METeOR-id-291036") {
                item.valueCodeableConcept.coding.forEach(function(val){
                    //console.log(val)
                    $("#userIndigenousStatus input[type='radio'][value="+val.code+"]").prop('checked', true);

                });
            };
        });
        fillViews.indigenous();
    },
    "orgs": function(data) {
        $("#userOrgs input[name='organization']").each(function() {
            $(this).prop("checked", false);
        });

        var orgStates = [];

        if (data.identifier) {
            (data.identifier).forEach(function(item) {
                if (item.system === "http://us.truenth.org/identity-codes/practice-region" && hasValue(item.value)) {
                    orgStates.push((item.value).split(":")[1]);
                }
            });
        };

        $.each(data.careProvider,function(i,val){
            var orgID = val.reference.split("/").pop();
            if (orgID == "0") {
                $("#userOrgs #noOrgs").prop("checked", true);
                $("#stateSelector").find("option[value='none']").prop("selected", true).val("none");
            }
            else {
                var ckOrg;
                if (orgStates.length > 0 && $(".state-container").length > 0) {
                    orgStates.forEach(function(state) {
                        ckOrg = $("#userOrgs input.clinic[value="+orgID+"][state='" + state + "']");
                        ckOrg.prop("checked", true);
                        $("#stateSelector").find("option[value='" + state + "']").prop("selected", true).val(i18next.t(state));
                    });
                    $(".noOrg-container").show();
                } else {
                    var ckOrg = $("body").find("#userOrgs input.clinic[value="+orgID+"]");
                    if (ckOrg.length > 0) ckOrg.prop('checked', true);
                    else {
                        var topLevelOrg = $("#fillOrgs").find("legend[orgid='" + orgID + "']");
                        if (topLevelOrg.length > 0) topLevelOrg.attr("data-checked", "true");
                    };
                };
            };
        });
        fillViews.org();
    },
    "subjectId": function(data) {
        if (data.identifier) {
            (data.identifier).forEach(function(item) {
                if (item.system == SYSTEM_IDENTIFIER_ENUM["external_study_id"]) {
                    if (hasValue(item.value)) $("#profileStudyId").val(i18next.t(item.value));
                };
            });
        };
        fillViews.studyId();
    },
    "siteId": function(data) {
        if (data.identifier) {
            (data.identifier).forEach(function(item) {
                if (item.system == SYSTEM_IDENTIFIER_ENUM["external_site_id"]) {
                    if (hasValue(item.value)) $("#profileSiteId").val(i18next.t(item.value));
                };
            });
        };
        fillViews.siteId();
    },
    "consentList" : function(data, userId, errorMessage, errorCode) {
        /**** CONSENT_WITH_TOP_LEVEL_ORG variable is set in template. see profile_macros.html for details ****/
        var ctop = (typeof CONSENT_WITH_TOP_LEVEL_ORG != "undefined") && CONSENT_WITH_TOP_LEVEL_ORG;
        var content = "";
        if (data && data["consent_agreements"] && data["consent_agreements"].length > 0) {
            var dataArray = data["consent_agreements"].sort(function(a,b){
                 return new Date(b.signed) - new Date(a.signed);
            });
            var existingOrgs = {};
            var hasConsent = false;
            var isAdmin = typeof _isAdmin != "undefined" && _isAdmin ? true: false;
            var editable = (typeof consentEditable != "undefined" && consentEditable == true) ? true : false;
            var consentDateEditable = editable && (typeof isTestPatient != "undefined" && isTestPatient);
            content = "<table id='consentListTable' class='table-bordered table-condensed table-responsive' style='width: 100%; max-width:100%'>";
            /********* Note that column headings are different between TrueNTH and EPROMs.
                 Use css class to hide/show headings accordingly
                 please see portal.css (for Truenth) and eproms.css (for EPROMs) for detail
             ********/
            var headerEnum = {"consentStatus": i18next.t("Consent Status"),
                              "status": i18next.t("Status"),
                              "agreement": i18next.t("Agreement"),
                              "consentDate": i18next.t("Date"),
                              "registrationDate": i18next.t("Regiatration Date"),
                              "locale": i18next.t("GMT")
                             };
            var headerArray = ['Organization',
                                '<span class="eproms-consent-status-header">' + headerEnum["consentStatus"] + '</span><span class="truenth-consent-status-header">' + headerEnum["status"] + '</span>',
                                '<span class="agreement">' + headerEnum["agreement"] + '</span>',
                                '<span class="eproms-consent-date-header">' + headerEnum["consentDate"] + '</span><span class="truenth-consent-date-header">' + headerEnum["registrationDate"] + '</span> <span class="gmt">(' + headerEnum["locale"] + ')</span>'];
            headerArray.forEach(function (title, index) {
                if (title != "n/a") content += "<TH class='consentlist-header'>" + title + "</TH>";
            });

            var hasContent = false;
            var touObj = [];

            //for EPROMS, there is also subject website consent, which are consent terms presented to patient at initial queries,
            //and also website terms of use
            // WILL NEED TO CLARIFY
            tnthAjax.getTerms(userId, false, true, function(data) {
                if (data && data.tous) {
                    (data.tous).forEach(function(item) {
                        var fType = $.trim(item.type).toLowerCase();
                        if (fType == "subject website consent" || fType == "website terms of use") {
                            item.accepted = tnthDates.formatDateString(item.accepted); //format to accepted format D m y
                            item.display_type = $.trim((item.type).toLowerCase().replace('subject', ''));  //for displaying consent type, note: this will remove text 'subject' from being displayed
                            touObj.push(item);
                        };
                    });
                };
            });

            //NEED TO CHECK THAT USER HAS ACTUALLY CONSENTED TO TERMS of USE
            var showInitialConsentTerms = (touObj.length > 0);
            var getTOUTableHTML = function(includeHeader) {
                var touContent = "";
                if (includeHeader) {
                    headerArray.forEach(function(title) {
                        touContent += "<th class='consentlist-header'>" + title + "</th>";
                    });
                };
                //Note: Truenth and Eproms have different text content for each column.  Using css classes to hide/show appropriate content
                //wording is not spec'd out for EPROMs. won't add anything specific until instructed
                touObj.forEach(function(item, index) {
                    var org = OT.orgsList[item.organization_id];
                    touContent += "<tr data-tou-type='" + item.type + "'>";
                    touContent += "<td><span class='eproms-tou-table-text'>" + (org && hasValue(org.name) ? i18next.t(org.name) : "--") + "</span><span class='truenth-tou-table-text'>TrueNTH USA</span></td>";
                    touContent += "<td><span class='text-success small-text eproms-tou-table-text'>Agreed to <a href='" + item.agreement_url + "' target='_blank'><span class='text-capitalize'>" + i18next.t(item.display_type) + "</span></a></span><span class='text-success small-text truenth-tou-table-text'>" + i18next.t("Agreed to terms") + "</span></td>";
                    touContent += "<td><span class='eproms-tou-table-text text-capitalize'><a href='" + item.agreement_url + "' target='_blank'>" + i18next.t(item.display_type) + "</a></span><span class='truenth-tou-table-text'>" + i18next.t("TrueNTH USA Terms of Use") + "</span> <span class='agreement'>&nbsp;<a href='" + item.agreement_url + "' target='_blank'><em>" + i18next.t("View") + "</em></a></span></td>";
                    touContent += "<td>" + item.accepted + "</td></tr>";
                });
                return touContent;
            };

            dataArray.forEach(function(item, index) {
                if (item.deleted) return true;
                if (!(existingOrgs[item.organization_id]) && !(/null/.test(item.agreement_url))) {
                    if (!OT.initialized) tnthAjax.getOrgs(userId, false, true, null);
                    hasContent = true;
                    var orgName = "";
                    var orgId = item.organization_id;
                    /*****
                        consent with top level org config value is only set in Truenth, we need to get the top level org name(s) for each consent
                        for displaying purpose in EPROMs
                            ******/
                    if (!ctop) {
                        try {
                            var topOrgID = OT.getTopLevelParentOrg(orgId);
                            orgName = OT.orgsList[topOrgID].name;

                        } catch(e) {
                            orgName = OT.orgsList[orgId].name;
                        }
                    } else orgName = OT.orgsList[orgId].name;

                    var expired = (item.expires) ? tnthDates.getDateDiff(String(item.expires)) : 0;
                    var consentStatus = item.deleted ? "deleted" : (expired > 0 ? "expired": "active");
                    var deleteDate = item.deleted ? item.deleted["lastUpdated"]: "";
                    var sDisplay = "", cflag = "";
                    var se = item.staff_editable, sr = item.send_reminders, ir = item.include_in_reports, cflag = "";
                    var signedDate = tnthDates.formatDateString(item.signed);
                    var editorUrlEl = $("#" + orgId + "_editor_url");
                    var isDefault = /stock\-org\-consent/.test(item.agreement_url);
                    var consentLabels = {
                        "default": i18next.t("Consented"),
                        "consented": i18next.t("Consented / Enrolled"),
                        "withdrawn": "<span data-eproms='true'>" + i18next.t("Withdrawn - Suspend Data Collection and Report Historic Data") + "</span>" +
                                      "<span data-truenth='true'>" + i18next.t("Suspend Data Collection and Report Historic Data") + "</span>",
                        "purged": "Purged / Removed"
                    };

                    switch(consentStatus) {
                        case "deleted":
                            sDisplay = "<span class='text-danger'>&#10007;</span><br/><span class='text-danger' style='font-size: 0.9em'>(" + i18next.t("deleted on") + " " + deleteDate.replace("T", " ") + " GMT)</span>";
                            break;
                        case "expired":
                            sDisplay = "<span class='text-warning'>&#10007; <br><span>(" + i18next.t("expired") + "</span>";
                            break;
                        case "active":
                            if (se && sr && ir) {
                                    if (isDefault) sDisplay = "<span class='text-success small-text'>" + consentLabels["default"] + "</span>";
                                    else sDisplay = "<span class='text-success small-text'>" + consentLabels["consented"] + "</span>";
                                    cflag = "consented";
                            } else if (se && ir && !sr) {
                                    sDisplay = "<span class='text-warning small-text withdrawn-label'>" + consentLabels["withdrawn"] + "</span>";
                                    cflag = "suspended";
                            } else if (!se && !ir && !sr) {
                                    sDisplay = "<span class='text-danger small-text'>" + consentLabels["purged"] + "</span>";
                                    cflag = "purged";
                            } else {
                                //backward compatible?
                                sDisplay = "<span class='text-success small-text'>" + consentLabels["consented"] + "</span>";
                                cflag = "consented";
                            };
                            break;
                    };
                    var modalContent = "", consentDateModalContent = "";

                    if (editable && consentStatus == "active") {
                        /****** modal content for modifying consent status *******/
                        /*
                         * NOTE, consent withdrawn verbiage is different between EPROMS and TRUENTH
                         * different verbiage is hidden/shown via css - see .withdrawn-label class in respective css files
                         */
                        modalContent += '<div class="modal fade" id="consent' + index + 'Modal" tabindex="-1" role="dialog" aria-labelledby="consent' + index + 'ModalLabel">'
                            + '<div class="modal-dialog" role="document">'
                            + '<div class="modal-content">'
                            + '<div class="modal-header">'
                            + '<button type="button" class="close" data-dismiss="modal" aria-label="' + i18next.t("Close") +'"><span aria-hidden="true">&times;</span></button>'
                            + '<h5 class="modal-title">' + i18next.t("Consent Status Editor") + '</h5>'
                            + '</div>'
                            + '<div class="modal-body" style="padding: 0 2em">'
                            + '<br/><h4 style="margin-bottom: 1em">' + i18next.t("Modify the consent status for this user to") + '</h4>'
                            + '<div style="font-size:0.95em; margin-left:1em">'
                            + '<div class="radio"><label><input class="radio_consent_input" name="radio_consent_' + index + '" type="radio" modalId="consent' + index + 'Modal" value="consented" data-orgId="' + item.organization_id + '" data-agreementUrl="' + String(item.agreement_url).trim() + '" data-userId="' + userId + '" ' +  (cflag == "consented"?"checked": "") + '>' + consentLabels["consented"] + '</input></label></div>'
                            + '<div class="radio"><label class="text-warning"><input class="radio_consent_input" name="radio_consent_' + index + '" type="radio" modalId="consent' + index + 'Modal" value="suspended" data-orgId="' + item.organization_id + '" data-agreementUrl="' + String(item.agreement_url).trim() + '" data-userId="' + userId + '" ' +  (cflag == "suspended"?"checked": "") + '><span class="withdrawn-label">' + consentLabels["withdrawn"] + '</span></input></label></div>'
                            + (isAdmin ? ('<div class="radio"><label class="text-danger"><input class="radio_consent_input" name="radio_consent_' + index + '" type="radio" modalId="consent' + index + 'Modal" value="purged" data-orgId="' + item.organization_id + '" data-agreementUrl="' + String(item.agreement_url).trim() + '" data-userId="' + userId + '" ' + (cflag == "purged"?"checked": "") +'>' + consentLabels["purged"] + '</input></label></div>') : "")
                            + '</div><br/><br/>'
                            + '</div>'
                            + '<div class="modal-footer">'
                            + '<button type="button" class="btn btn-default" data-dismiss="modal" style="font-size:0.9em">' + i18next.t("Close", {"": "Close"}) + '</button>'
                            + '</div>'
                            + '</div></div></div>';

                        /**** modal content for editing consent date for test patient ****/
                        consentDateModalContent += '<div class="modal fade consent-date-modal" id="consentDate' + index + 'Modal" tabindex="-1" role="dialog" aria-labelledby="consentDate' + index + 'ModalLabel">'
                            + '<div class="modal-dialog" role="document">'
                            + '<div class="modal-content">'
                            + '<div class="modal-header">'
                            + '<button type="button" class="close" data-dismiss="modal" aria-label="' + i18next.t("Close") + '"><span aria-hidden="true">&times;</span></button>'
                            + '<h5 class="modal-title">' + i18next.t("Consent Date Editor") + '</h5>'
                            + '</div>'
                            + '<div class="modal-body" style="padding: 0 2em">'
                            + '<br/><h4>Current consent date: <span class="text-success">' + tnthDates.formatDateString(item.signed, "d M y hh:mm:ss") + '</span></h4>'
                            + '<p style="margin-bottom: 0.6em">' + i18next.t("Modify the consent date") + ' <span class="text-muted">' + i18next.t("(GMT 24-hour format)") + '</span> ' + i18next.t("for this agreement to:") +  '</p>'
                            + '<br/><div id="consentDateLoader_' + index + '" class="loading-message-indicator"><i class="fa fa-spinner fa-spin fa-2x"></i></div>'
                            + '<div id="consentDateContainer_' + index + '" class="form-group consent-date-container">'
                            + '<div class="row">'
                            + '<div class="col-md-3 col-sm-3">'
                            + '<input type="text" id="consentDate_' + index + '" class="form-control consent-date" data-index="' + index + '" data-status="' + cflag + '" data-orgId="' + item.organization_id + '" data-agreementUrl="' + String(item.agreement_url).trim() + '" data-userId="' + userId + '" placeholder="d M yyyy" maxlength="11" style="margin: 0.5em 0"/>'
                            + '</div>'
                            + '<div class="col-md-2 col-sm-3">'
                            + '<input type="text" id="consentHour_' + index + '" maxlength="2" placeholder="hh" data-index="' + index + '" class="form-control consent-hour" data-default-value="00" style="width: 60px; margin: 0.5em 0;"/>'
                            + '</div>'
                            + '<div class="col-md-2 col-sm-3">'
                            + '<input type="text" id="consentMinute_' + index + '" maxlength="2" placeholder="mm" data-index="' + index + '" class="form-control consent-minute" data-default-value="00" style="width: 60px; margin: 0.5em 0;"/>'
                            + '</div>'
                            + '<div class="col-md-2 col-sm-3">'
                            + '<input type="text" id="consentSecond_' + index + '" maxlength="2" placeholder="ss" data-index="' + index + '" class="form-control consent-second" data-default-value="00" style="width: 60px; margin: 0.5em 0;"/>'
                            + '</div></div>'
                            + '</div><div id="consentDateError_' + index + '" class="set-consent-error error-message"></div><br/><br/>'
                            + '</div>'
                            + '<div class="modal-footer">'
                            + '<button type="button" class="btn btn-default btn-submit" data-index="' + index + '">' + i18next.t("Submit") + '</button>'
                            + '<button type="button" class="btn btn-default" data-dismiss="modal">' + i18next.t("Close") + '</button>'
                            + '</div>'
                            + '</div></div></div>';

                    };

                    if (showInitialConsentTerms) content += getTOUTableHTML();

                    content += "<tr>";

                    [
                        {
                            content: (orgName != "" && orgName != undefined? orgName : item.organization_id)
                        },
                        {
                            content: sDisplay + (editable && consentStatus == "active"? '&nbsp;&nbsp;<a data-toggle="modal" data-target="#consent' + index + 'Modal" ><span class="glyphicon glyphicon-pencil" aria-hidden="true" style="cursor:pointer; color: #000"></span></a>' + modalContent: ""),
                            "_class": "indent"
                        },
                        {
                            content: function(item) {
                                var s = "";
                                if (isDefault) s = i18next.t("Sharing information with clinics ") + "<span class='agreement'>&nbsp;<a href='" + decodeURIComponent(item.agreement_url) + "' target='_blank'><em>" + i18next.t("View") + "</em></a></span>";
                                else {
                                    s = "<span class='agreement'><a href='" + item.agreement_url + "' target='_blank'><em>View</em></a></span>" +
                                    ((editorUrlEl.length > 0 && hasValue(editorUrlEl.val())) ? ("<div class='button--LR' " + (editorUrlEl.attr("data-show") == "true" ?"data-show='true'": "data-show='false'") + "><a href='" + editorUrlEl.val() + "' target='_blank'>" + i18next.t("Edit in Liferay") + "</a></div>") : "")
                                };
                                return s;
                            } (item)
                        },
                        {
                            content: signedDate + (consentDateEditable && consentStatus == "active"? '&nbsp;&nbsp;<a data-toggle="modal" data-target="#consentDate' + index + 'Modal" ><span class="glyphicon glyphicon-pencil" aria-hidden="true" style="cursor:pointer; color: #000"></span></a>' + consentDateModalContent: "")

                        }
                    ].forEach(function(cell) {
                        if (cell.content != "n/a") content += "<td class='consentlist-cell" + (cell._class? (" " + cell._class): "") + "' >" + cell.content + "</td>";
                    });
                    content += "</tr>";
                    existingOrgs[item.organization_id] = true;
                };

            });
            content += "</table>";

            if (hasContent) {
                $("#profileConsentList").html(content);
                if (!ctop) $("#profileConsentList .agreement").each(function() {
                    $(this).parent().hide();
                });
                 $("#profileConsentList .button--LR").each(function() {
                     if ($(this).attr("show") == "true") $(this).addClass("show");
                 });
            } else {
                if (showInitialConsentTerms) {
                        content = "<table id='consentListTable' class='table-bordered table-hover table-condensed table-responsive' style='width: 100%; max-width:100%'>"
                        content += getTOUTableHTML(true);
                        content += "</table>"
                        $("#profileConsentList").html(content);
                } else  $("#profileConsentList").html("<span class='text-muted'>" + i18next.t("No Consent Record Found") + "</span>");
            };

            $("#profileConsentList tr:visible").each(function(index) {
                if (index % 2 === 0) $(this).addClass("even");
                else $(this).addClass("odd");
            });

            if (editable) {
                $("input[class='radio_consent_input']").each(function() {
                    $(this).on("click", function() {
                        var o = CONSENT_ENUM[$(this).val()];
                        if (o) {
                            o.org = $(this).attr("data-orgId");
                            o.agreementUrl = $(this).attr("data-agreementUrl");
                        };
                        if ($(this).val() == "purged") tnthAjax.deleteConsent($(this).attr("data-userId"), {org: $(this).attr("data-orgId")});
                        else  tnthAjax.setConsent($(this).attr("data-userId"), o, $(this).val());
                        $("#" + $(this).attr("modalId")).modal('hide');
                        if (typeof reloadConsentList != "undefined") reloadConsentList();
                    });
                });
            };
            if (consentDateEditable) {
                var today = new Date();
                $(".consent-date-modal").each(function() {
                    $(this).on("shown.bs.modal", function() {
                        $(this).find(".consent-date").focus();
                        $(this).addClass("active");
                        $(this).find("input").each(function() {
                            if (hasValue($(this).attr("data-default-value"))) $(this).val($(this).attr("data-default-value"));
                            else $(this).val("");
                        });
                        $(this).find(".set-consent-error").html("");
                    });
                    $(this).on("hidden.bs.modal", function() {
                        $(this).removeClass("active");
                    });
                });
                $("#profileConsentList .consent-date").datepicker({"format": "d M yyyy", "forceParse": false, "endDate": today, "autoclose": true});
                $("#profileConsentList .consent-hour, #profileConsentList .consent-minute, #profileConsentList .consent-second").each(function() {
                    __convertToNumericField($(this));
                });
                $("#profileConsentList .consent-date, #profileConsentList .consent-hour, #profileConsentList .consent-minute, #profileConsentList .consent-second").each(function() {
                    $(this).on("change", function() {
                        var dataIndex = $.trim($(this).attr("data-index"));
                        var d = $("#consentDate_" + dataIndex);
                        var h = $("#consentHour_" + dataIndex).val();
                        var m = $("#consentMinute_" + dataIndex).val();
                        var s = $("#consentSecond_" + dataIndex).val();
                        var errorMessage = "";

                        if (hasValue(d.val())) {
                            var isValid = tnthDates.isValidDefaultDateFormat(d.val());
                            if (!isValid) {
                                errorMessage += (hasValue(errorMessage)?"<br/>":"") + i18next.t("Date must in the valid format.");
                                d.datepicker("hide");
                            };
                        };

                        /**** validate hour [0]0 ****/
                        if (hasValue(h)) {
                            if (!(/^([1-9]|0[0-9]|1\d|2[0-3])$/.test(h))) {
                                errorMessage += (hasValue(errorMessage)?"<br/>":"") + i18next.t("Hour must be in valid format, range 0 to 23.");
                            };
                        };

                        /***** validate minute [0]0 *****/
                        if (hasValue(m)) {
                            if (!(/^(0[0-9]|[1-9]|[1-5]\d)$/.test(m))) {
                                errorMessage += (hasValue(errorMessage)?"<br/>":"") + i18next.t("Minute must be in valid format, range 0 to 59.");
                            };
                        };
                        /***** validate second [0]0 *****/
                        if (hasValue(s)) {
                            if (!(/^(0[0-9]|[1-9]|[1-5]\d)$/.test(s))) {
                                errorMessage += (hasValue(errorMessage)?"<br/>":"") + i18next.t("Second must be in valid format, range 0 to 59.");
                            };
                        };

                        if (hasValue(errorMessage)) {
                            $("#consentDateError_" + dataIndex).html(errorMessage);
                        } else $("#consentDateError_" + dataIndex).html("");

                    });
                });

                $("#profileConsentList .btn-submit").each(function() {
                    $(this).on("click", function() {
                        var dataIndex = $.trim($(this).attr("data-index"));
                        var ct = $("#consentDate_" + dataIndex);
                        var h = $("#consentHour_" + dataIndex).val();
                        var m = $("#consentMinute_" + dataIndex).val();
                        var s = $("#consentSecond_" + dataIndex).val();
                        var isValid = hasValue(ct.val());
                        if (isValid) {
                            var dt = new Date(ct.val());
                            //2017-07-06T22:04:50 format
                            var cDate = dt.getFullYear()
                                        + "-"
                                        + (dt.getMonth()+1)
                                        + "-"
                                        + dt.getDate()
                                        + "T"
                                        + (hasValue(h) ? pad(h) : "00")
                                        + ":"
                                        + (hasValue(m) ? pad(m) : "00")
                                        + ":"
                                        + (hasValue(s) ? pad(s) : "00");

                            var o = CONSENT_ENUM[ct.attr("data-status")];

                            if (o) {
                                o.org = ct.attr("data-orgId");
                                o.agreementUrl = ct.attr("data-agreementUrl");
                                o.acceptance_date = cDate;
                                o.testPatient = true;
                                setTimeout((function() { $("#consentDateContainer_" + dataIndex).hide(); })(), 200);
                                setTimeout((function() { $("#consentDateLoader_" + dataIndex).show(); })(), 450);
                                /**** disable close buttons while processing request ***/
                                $("#consentListTable button[data-dismiss]").attr("disabled", true);

                                //serId, params, status, sync, callback)
                                var serverErrorMessage = i18next.t("Error processing data.  Make sure the date is in the correct format.");
                                setTimeout("tnthAjax.setConsent(" + ct.attr("data-userId") + "," + JSON.stringify(o) + ",'" + ct.attr("data-status") + "', true, function(data) { if (data) {"
                                            + " if (data && data.error) { "
                                            + '  $("#profileConsentList .consent-date-modal.active").find(".set-consent-error").text("' + serverErrorMessage + '"); '
                                            + '  setTimeout((function() { $("#profileConsentList .consent-date-modal.active").find(".consent-date-container").show(); })(), 200);'
                                            + '  setTimeout((function() { $("#profileConsentList .consent-date-modal.active").find(".loading-message-indicator").hide(); })(), 450);'
                                            + '  $("#consentListTable button[data-dismiss]").attr("disabled", false);'
                                            + '  } else { '
                                            + '  $("#consentListTable .modal").modal("hide");'
                                            + '  if (typeof reloadConsentList != "undefined") reloadConsentList(); '
                                            + '  else setTimeout("location.reload();", 2000); '
                                            + '  }; '
                                            + ' }})', 100);
                            };
                        } else  $("#consentDateError_" + dataIndex).text(i18next.t("You must enter a valid date/time"));

                    });
                });
            };

        } else {
            if (hasValue(errorMessage)) {
                $("#profileConsentList").html(errorMessage ? ("<p class='text-danger'>" + errorMessage + "</p>") : ("<p class='text-muted'>" + i18next.t("No consent found for this user.") + "</p>"));
            } else if (parseInt(errorCode) == 401) {
                var msg = i18next.t("You do not have permission to edit this patient record.");
                $("#profileConsentList").html("<p class='text-danger'>" + msg + "</p>");
            } else {
                if (showInitialConsentTerms) {
                    content = "<table id='consentListTable' class='table-bordered table-hover table-condensed table-responsive' style='width: 100%; max-width:100%'>"
                    content += getTOUTableHTML(true);
                    content += "</table>";
                    $("#profileConsentList").html(content);
                } else $("#profileConsentList").html("<span class='text-muted'>" + i18next.t("No Consent Record Found")+ "</span>");
            };
        };
        $("#profileConsentList").animate({opacity: 1});
    },
    "treatment": function(data) {
        var treatmentCode = tnthAjax.hasTreatment(data);
        if (treatmentCode) {
            if (treatmentCode == CANCER_TREATMENT_CODE) {
                $("#tx_yes").prop("checked", true);
            } else {
                $("#tx_no").prop("checked", true);
            };
        };
    },
    "proceduresContent": function(data,newEntry) {
        if (data.entry.length == 0) {
            $("body").find("#userProcedures").html("<p id='noEvents' style='margin: 0.5em 0 0 1em'><em>" + i18next.t("You haven't entered any management option yet.") + "</em></p>").animate({opacity: 1});
            $("#pastTreatmentsContainer").hide();
            fillViews.procedure();
            return false;
        };

        // sort from newest to oldest
        data.entry.sort(function(a,b){
            return new Date(b.resource.performedDateTime) - new Date(a.resource.performedDateTime);
        });

        var contentHTML = "", proceduresHtml = "";
        // If we're adding a procedure in-page, then identify the highestId (most recent) so we can put "added" icon
        var highestId = 0;
        $.each(data.entry,function(i,val){
            var code = val.resource.code.coding[0].code;
            if (code != CANCER_TREATMENT_CODE && code != NONE_TREATMENT_CODE) {
                var procID = val.resource.id;
                var displayText = val.resource.code.coding[0].display;
                var performedDateTime = val.resource.performedDateTime;
                var performedDate = new Date(String(performedDateTime).replace(/-/g,"/").substring(0, performedDateTime.indexOf('T')));
                var cPerformDate = performedDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
                //console.log("date: " + performedDateTime + " cdate: " + performedDate);
                var deleteInvocation = '';
                var creatorDisplay = val.resource.meta.by.display;
                var creator = val.resource.meta.by.reference;
                creator = creator.match(/\d+/)[0];// just the user ID, not eg "api/patient/46";
                if (creator == currentUserId) {
                    creator = i18next.t("you");
                    deleteInvocation = "  <a data-toggle='popover' class='btn btn-default btn-xs confirm-delete' style='font-size: 0.95em; padding: 0.2em 0.6em; color:#777; border: 1px solid #bdb9b9; position: relative; top: -0.3em' data-content='" + i18next.t("Are you sure you want to delete this treatment?") + "<br /><br /><a href=\"#\" class=\"btn-delete btn btn-tnth-primary\" style=\"font-size:0.95em\">" + i18next.t("Yes") + "</a> &nbsp;&nbsp;&nbsp; <a class=\"btn cancel-delete\" style=\"font-size: 0.95em\">" + i18next.t("No") + "</a>' rel='popover'><i class='fa fa-times'></i> " + i18next.t("Delete") + "</span>";
                }
                else if (creator == subjectId) {
                    creator = i18next.t("this patient");
                }
                else creator = i18next.t("staff member") + ", <span class='creator'>" + (hasValue(creatorDisplay) ? creatorDisplay: creator) + "</span>, ";
                var dtEdited = val.resource.meta.lastUpdated;
                dateEdited = new Date(dtEdited);
                contentHTML += "<tr data-id='" + procID + "' data-code='" + code + "'><td width='1%' valign='top' class='list-cell'>&#9679;</td><td class='col-md-8 col-xs-8' valign='top'>" + (cPerformDate?cPerformDate:performedDate) + "&nbsp;--&nbsp;" + displayText + "&nbsp;<em>(" + i18next.t("data entered by ") + creator + i18next.t(" on ") + dateEdited.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) + ")</em></td><td class='col-md-4 col-xs-4 lastCell text-left' valign='top'>&nbsp;" + deleteInvocation + "</td></tr>";
                if (procID > highestId) {
                    highestId = procID;
                };
            };
        });

        if (hasValue(contentHTML)) {
            proceduresHtml = '<table  class="table-responsive" width="100%" id="eventListtnthproc" cellspacing="4" cellpadding="6">';
            proceduresHtml += contentHTML;
            proceduresHtml += '</table>';
            $("#userProcedures").html(proceduresHtml);
            $("#pastTreatmentsContainer").fadeIn();

        } else {
            $("#pastTreatmentsContainer").fadeOut();
        }

        // If newEntry, then add icon to what we just added
        if (newEntry) {
            $("#eventListtnthproc").find("tr[data-id='" + highestId + "'] td.lastCell").append("&nbsp; <small class='text-success'><i class='fa fa-check-square-o'></i> <em>" + i18next.t("Added") + "!</em></small>");
        }
        $('[data-toggle="popover"]').popover({
            trigger: 'click',
            placement: 'top',
            html: true
        });
        fillViews.procedure();
    },
    "timezone": function(data) {
        data.extension.forEach(function(item, index) {
            if (item.url === "http://hl7.org/fhir/StructureDefinition/user-timezone") {
                $("#profileTimeZone option").each(function() {
                    if ($.trim($(this).val()) == $.trim(item.timezone)) {
                        $(this).prop("selected", true);
                    };
                });
            };
        });
        fillViews.timezone();
    },
    "roleList": function(data) {
        data.roles.forEach(function(role) {
            $("#rolesGroup").append("<div class='checkbox'><label><input type='checkbox' name='user_type' value='" + role.name + "' data-save-container-id='rolesGroup'>" + i18next.t((role.name.replace(/\_/g, " ").replace(/\b[a-z]/g,function(f){return f.toUpperCase();}))) + "</label></div>");
        });
    },
    "roles": function(data,isProfile) {
        $.each(data.roles, function(i,val){
            var userRole = val.name;
            // Handle profile differently than initial_queries
            if (isProfile) {
                $.each(data.roles,function(i,val){
                    $("#rolesGroup input:checkbox[value="+val.name+"]").prop('checked', true);
                });
            } else {
                var $radios = $('input[name=user_type]');
                if($radios.is(':checked') === false) {
                    $radios.filter('[value='+userRole+']').prop('checked', true);
                };
            }
        });
    },
    "terms": function(data) {
        if (data.tous) {
            function typeInTous(type) {
                var found = false;
                (data.tous).forEach(function(item) {
                    if (!found && item.type == type) found = true;
                });
                return found;
            };

            $("#termsCheckbox [data-type='terms']").each(function() {
                var arrTypes = ($(this).attr("data-tou-type")).split(",");
                var self = $(this);
                var item_found  = 0;
                arrTypes.forEach(function(type) {
                    if (typeInTous(type)) {
                        item_found++;
                    };
                });
                var additional = $(this).find("[data-core-data-subtype]");
                if (additional.length > 0) {
                    at = additional.attr("data-tou-type");
                    if (typeInTous(at)) item_found++;
                };
                if (item_found == (arrTypes.length+additional.length)) {
                    self.find("i").removeClass("fa-square-o").addClass("fa-check-square-o").addClass("edit-view");
                    self.attr("data-agree", "true");
                    var vs = self.find(".display-view");
                    if (vs.length > 0) {
                        self.show();
                        vs.show();
                        (self.find(".edit-view")).each(function() {
                            $(this).hide();
                        });
                    };
                };
            });
        };
        setTimeout(function() {
            var agreedCheckboxes = $("#termsCheckbox [data-type='terms'][data-agree='false']:visible");
            if (agreedCheckboxes.length > 1) {
                $("#termsReminderCheckboxText").text(i18next.t("You must agree to the terms and conditions by checking the provided checkboxes."));
            };
            if (agreedCheckboxes.length == 0) $("#termsText").addClass("agreed");
        }, 2000);
    }
};
var assembleContent = {
    "demo": function(userId,onProfile, targetField, sync) {

        var demoArray = {};
        demoArray["resourceType"] = "Patient";

        var fname = $("input[name=firstname]").val(), lname = $("input[name=lastname]").val();

        demoArray["name"] = {
            "given": $.trim(fname),
            "family": $.trim(lname)
        };


        var bdFieldVal = $("input[name=birthDate]").val();

        if (! hasValue(bdFieldVal)) {
            var y = $("#year").val(), m = $("#month").val(), d = $("#date").val();
            if (hasValue(y) && hasValue(m) && hasValue(d)) bdFieldVal = y + "-" + m + "-" + d;
        };

        if (bdFieldVal != "") demoArray["birthDate"] = bdFieldVal;

        if ($("#userOrgs input[name='organization']").length > 0) {
            var orgIDs;
            orgIDs = $("#userOrgs input[name='organization']").map(function(){
                if ($(this).prop("checked")) return { reference: "api/organization/"+$(this).val() };
            }).get();

            if (orgIDs) {
                if (orgIDs.length > 0) {
                    demoArray["careProvider"] = orgIDs;
                };
            };

        };

        /**** dealing with the scenario where user can be affiliated with top level org e.g. CRV, IRONMAN, via direct database addition **/
        var topLevelOrgs = $("#fillOrgs legend[data-checked]");
        if (topLevelOrgs.length > 0)  {
            topLevelOrgs.each(function() {
                var tOrg = $(this).attr("orgid");
                if (hasValue(tOrg)) {
                    if (!demoArray["careProvider"]) demoArray["careProvider"] = [];
                    demoArray["careProvider"].push({reference: "api/organization/" + tOrg});
                };
            });
        };


         //don't update org to none if there are top level org affiliation above
         if (!demoArray["careProvider"] || (demoArray["careProvider"] && demoArray["careProvider"].length == 0)) {
            if ($("#aboutForm").length == 0) demoArray["careProvider"] = [{reference: "api/organization/" + 0}];
         };

        if (hasValue($("#deathDate").val())) {
            demoArray["deceasedDateTime"] = $("#deathDate").val();
        };

        if (!hasValue($("#deathDate").val())) {
            if ($("#boolDeath").length > 0) {
                if ($("#boolDeath").prop("checked")) {
                    demoArray["deceasedBoolean"] = true;
                } else demoArray["deceasedBoolean"] = false;
            };
        };

        if (onProfile) {

            // Grab profile field values - looks for regular and hidden, can be checkbox or radio
            var e =  $("#userEthnicity"), r = $("#userRace"), i = $("#userIndigenousStatus"), tz = $("#profileTimeZone");
            var ethnicityIDs, raceIDs, indigenousIDs, tzID;

            demoArray["extension"] = [];


            if (e.length > 0) {
                ethnicityIDs = $("#userEthnicity input:checked").map(function(){
                    return { code: $(this).val(), system: "http://hl7.org/fhir/v3/Ethnicity" };
                }).get();

                if (ethnicityIDs) {
                    demoArray["extension"].push(
                        {   "url": "http://hl7.org/fhir/StructureDefinition/us-core-ethnicity",
                            "valueCodeableConcept": {
                                "coding": ethnicityIDs
                            }
                        }
                    );
                };
            };
            // Look for race checkboxes, can be hidden
            if (r.length > 0 ) {
                raceIDs = $("#userRace input:checkbox:checked").map(function(){
                    return { code: $(this).val(), system: "http://hl7.org/fhir/v3/Race" };
                }).get();
                if (raceIDs) {
                    demoArray["extension"].push(
                        {   "url": "http://hl7.org/fhir/StructureDefinition/us-core-race",
                            "valueCodeableConcept": {
                                "coding": raceIDs
                            }
                        }
                    );

                };
            };

            if (i.length > 0) {
                indigenousIDs = $("#userIndigenousStatus input[type='radio']:checked").map(function() {
                    return { code: $(this).val(), system: "http://us.truenth.org/fhir/valueset/AU-NHHD-METeOR-id-291036" };
                }).get();
                if (indigenousIDs) {
                    demoArray["extension"].push(
                        {   "url": "http://us.truenth.org/fhir/StructureDefinition/AU-NHHD-METeOR-id-291036",
                             "valueCodeableConcept": {
                                 "coding": indigenousIDs
                             }
                         }
                    )
                };
            };

            if ($("#locale").length > 0 && $("#locale").find("option:selected").length > 0) {
                demoArray["communication"] = [
                    {"language": {
                        "coding": [
                            {   "code": $("#locale").find("option:selected").val(),
                                "display": $("#locale").find("option:selected").text(),
                                "system": "urn:ietf:bcp:47"
                            }
                        ]
                    }}
                ];
            };

            if (tz.length > 0) {
                tzID = $("#profileTimeZone option:selected").val();
                if (tzID) {
                    demoArray["extension"].push(
                        {
                            timezone: tzID,
                            url: "http://hl7.org/fhir/StructureDefinition/user-timezone"
                        }
                    );
                };
            };

            var studyId = $("#profileStudyId").val();
            var siteId = $("#profileSiteId").val();
            var states = [];

            $("#userOrgs input[name='organization']").each(function() {
                if ($(this).is(":checked")) {
                    if (hasValue($(this).attr("state")) && parseInt($(this).val()) != 0) states.push($(this).attr("state"));
                };
            });

            if (hasValue(studyId) || hasValue(siteId) || states.length > 0) {
                var identifiers = null;
                //get current identifier(s)
                $.ajax ({
                    type: "GET",
                    url: '/api/demographics/'+userId,
                    async: false
                }).done(function(data) {
                    if (data && data.identifier) {
                        identifiers = [];
                        (data.identifier).forEach(function(identifier) {
                            if (identifier.system != SYSTEM_IDENTIFIER_ENUM["external_study_id"] &&
                                identifier.system != SYSTEM_IDENTIFIER_ENUM["external_site_id"] &&
                                identifier.system != SYSTEM_IDENTIFIER_ENUM["practice_region"]) identifiers.push(identifier);
                        });
                    };
                }).fail(function() {
                   // console.log("Problem retrieving data from server.");
                });

                if (hasValue(studyId)) {
                    studyId = $.trim(studyId);
                    var studyIdObj = {
                        system: SYSTEM_IDENTIFIER_ENUM["external_study_id"],
                        use: "secondary",
                        value: studyId
                    };

                    if (identifiers) {
                        identifiers.push(studyIdObj);
                    } else {
                        identifiers = [studyIdObj];
                    };
                };

                if (hasValue(siteId)) {
                    siteId = $.trim(siteId);
                    var siteIdObj = {
                        system: SYSTEM_IDENTIFIER_ENUM["external_site_id"],
                        use: "secondary",
                        value: siteId
                    };

                    if (identifiers) {
                        identifiers.push(siteIdObj);
                    } else {
                        identifiers = [siteIdObj];
                    };
                };

                if (states.length > 0) {
                    states.forEach(function(state) {
                        identifiers.push({
                            system: SYSTEM_IDENTIFIER_ENUM["practice_region"],
                            use: "secondary",
                            value: "state:" + state
                        });
                    });
                };
                demoArray["identifier"] = identifiers;
            };


            demoArray["gender"] = $("input[name=sex]:checked").val();

            demoArray["telecom"] = [];

            var emailVal = $("input[name=email]").val();
            if ($.trim(emailVal) != "") {
                demoArray["telecom"].push({ "system": "email", "value": $.trim(emailVal) });
            } else {
                //'__no_email__'
                demoArray["telecom"].push({ "system": "email", "value": "__no_email__" });
            };

            demoArray["telecom"].push({ "system": "phone", "use": "mobile", "value": $.trim($("input[name=phone]").val()) });
            demoArray["telecom"].push({ "system": "phone", "use": "home", "value": $.trim($("input[name=altPhone]").val()) });
        };
        tnthAjax.putDemo(userId,demoArray, targetField, sync);

    },
    "name": function(userId) {

        var firstName = $("input[name=firstname]").val();
        var lastName = $("input[name=lastname]").val();
        if (firstName != "" && lastName != "") {
            var demoArray = {};
            demoArray["resourceType"] = "Patient";
            demoArray["name"] = {
                "given": $("input[name=firstname]").val(),
                "family": $("input[name=lastname]").val()
            };
            tnthAjax.putDemo(userId,demoArray);
        };

    },
    "dob": function(userId) {
        var demoArray = {};
        var birthday = $("input[name='birthDate']").val();
        var month = $("#month").find("option:selected").val();
        var day = $("input[name='birthdayDate']").val();
        var year = $("input[name='birthdayYear']").val();
        var birthDate = "";

        if (birthday == "") {
            if (month != "" && day != "" && year != "") {
                birthDate = year + "-" + month + "-" + day;
            };
        };
        if (birthday  != "" || birthDate != "") {
            demoArray["resourceType"] = "Patient";
            demoArray["birthDate"] = (birthday != "" ? birthday: birthDate);
            tnthAjax.putDemo(userId,demoArray);
        }
    },
    "orgs": function(userId) {

        var orgIDs = $("#userOrgs input[name='organization']:checked").map(function(){
            return { reference: "api/organization/"+$(this).val() };
        }).get();

        //console.log("org ids" + orgIDs)

        if (typeof orgIDs === 'undefined'){
            orgIDs = [0]  // special value for `none of the above`
        };


        var demoArray = {};
        demoArray["resourceType"] = "Patient";
        demoArray["careProvider"] = orgIDs;
        tnthAjax.putDemo(userId, demoArray);
    },
    "coreData": function(userId) {
        var demoArray = {};
        demoArray["resourceType"] = "Patient";
        demoArray["extension"] = [];
        if ($("#userEthnicity").length > 0) {
            var ethnicityIDs = $("#userEthnicity input:checked").map(function(){
                return { code: $(this).val(), system: "http://hl7.org/fhir/v3/Ethnicity" };
            }).get();
            demoArray["extension"].push(
                { "url": "http://hl7.org/fhir/StructureDefinition/us-core-ethnicity",
                    "valueCodeableConcept": {
                        "coding": ethnicityIDs
                    }
                }
            );
        }
        if ($("#userRace").length > 0) {
            var raceIDs = $("#userRace input:checkbox:checked").map(function(){
                return { code: $(this).val(), system: "http://hl7.org/fhir/v3/Race" };
            }).get();
            demoArray["extension"].push(
                { "url": "http://hl7.org/fhir/StructureDefinition/us-core-race",
                    "valueCodeableConcept": {
                        "coding": raceIDs
                    }
                }
            );
        }
        tnthAjax.putDemo(userId,demoArray);
    }
};

var OrgObj = function(orgId, orgName, parentOrg) {
    this.id = orgId;
    this.name = orgName;
    this.children = [];
    this.parentOrgId = parentOrg;
    this.isTopLevel = false;
    this.language = null;
    this.extension = [];
};

var OrgTool = function() {
    this.TOP_LEVEL_ORGS = [];
    this.orgsList = {};
    this.initialized = false;
};
OrgTool.prototype.setUserId = function(userId) {
    $("#fillOrgs").attr("userId", userId);
};
OrgTool.prototype.getUserId = function() {
    return $("#fillOrgs").attr("userId");
}
OrgTool.prototype.inArray = function( n, array) {
  if (n && array && Array.isArray(array)) {
    var found = false;
    for (var index = 0; !found && index < array.length; index++) {
        if (array[index] == n) found = true;
    };
    return found;
  } else return false;
};
OrgTool.prototype.getElementParentOrg = function(o) {
    var parentOrg;
    if (o) {
       parentOrg = $(o).attr("data-parent-id");
       if (!hasValue(parentOrg)) parentOrg = $(o).closest(".org-container[data-parent-id]").attr("data-parent-id");
    };
    return parentOrg;
};
OrgTool.prototype.getTopLevelOrgs = function() {
  var ml = this.getOrgsList(), orgList = [];
  for (var org in ml) {
    if (ml[org].isTopLevel) orgList.push(org);
  };
  return orgList;
};
OrgTool.prototype.getOrgsList = function() {
    return this.orgsList;
};
OrgTool.prototype.filterOrgs = function(leafOrgs) {
    if (!leafOrgs) return false;
    if (leafOrgs.length == 0) return false;
    var self = this;

    $("input[name='organization']").each(function() {
        if (! self.inArray($(this).val(), leafOrgs)) {
            $(this).hide();
            if (self.orgsList[$(this).val()] && self.orgsList[$(this).val()].children.length == 0) {
                var l = $(this).closest("label");
                l.hide();
                l.next(".divider").hide();
            };
        };
    });

    var topList = self.getTopLevelOrgs();

    topList.forEach(function(orgId) {
        var allChildrenHidden = true;
        $(".org-container[data-parent-id='" + orgId + "']").each(function() {
            var subOrgs = $(this).find(".org-container");
            if (subOrgs.length > 0) {
                var allSubOrgsHidden = true;
                subOrgs.each(function() {
                     var isVisible = false;
                     $(this).find("input[name='organization']").each(function() {
                         if ($(this).is(":visible") || $(this).css("display") != "none") {
                            isVisible = true;
                            allChildrenHidden = false;
                         };
                     });

                    if (!isVisible) {
                        $(this).hide();
                    } else allSubOrgsHidden = false;

                });

                if (allSubOrgsHidden) {
                    $(this).children("label").hide();
                };

            } else {
                var ip = $(this).find("input[name='organization']");
                if (ip.length > 0) {
                    ip.each(function() {
                        if ($(this).is(":visible") || $(this).css("display") != "none") allChildrenHidden = false;
                    });
                };
            };
        });
        if (allChildrenHidden) {
            $("#fillOrgs").find("legend[orgid='" + orgId + "']").hide();
        };

    });
};
OrgTool.prototype.findOrg = function(entry, orgId) {
    var org;
    if (entry && orgId) {
        entry.forEach(function(item) {
            if (!org) {
                if (item.id == orgId) org = item;
            };
        });
    };
    return org;
};
OrgTool.prototype.populateOrgsList = function(items) {
    if (!items) return false;
    var entry = items, self = this, parentId, orgsList = self.orgsList;
    items.forEach(function(item) {
        if (item.partOf) {
            parentId = item.partOf.reference.split("/").pop();
            if (!orgsList[parentId]) {
                var o = self.findOrg(entry, parentId);
                orgsList[parentId] = new OrgObj(o.id, o.name);
            };
            orgsList[parentId].children.push(new OrgObj(item.id, item.name, parentId));
            if (orgsList[item.id]) orgsList[item.id].parentOrgId = parentId;
            else orgsList[item.id] = new OrgObj(item.id, item.name, parentId);
        } else {
            if (!orgsList[item.id]) orgsList[item.id] = new OrgObj(item.id, item.name);
            if (item.id != 0) {
                orgsList[item.id].isTopLevel = true;
                self.TOP_LEVEL_ORGS.push(item.id);
            };
        };
        if (item.extension) orgsList[item.id].extension = item.extension;
        if (hasValue(item.language)) orgsList[item.id].language = item.language;
        if (item.identifier) orgsList[item.id].identifier = item.identifier;
    });
    items.forEach(function(item) {
        if (item.partOf) {
            parentId = item.partOf.reference.split("/").pop();
            if (orgsList[item.id]) orgsList[item.id].parentOrgId = parentId;
        };
    });
    this.initialized = true;
    return orgsList;
};
OrgTool.prototype.populateUI = function() {
    var parentOrgsCt = 0, topLevelOrgs = this.getTopLevelOrgs(), container = $("#fillOrgs"), orgsList = this.orgsList;
    var getState = function(item) {
                    var s = "", found = false;
                    if (item.identifier) {
                        (item.identifier).forEach(function(i) {
                            if (!found && (i.system === SYSTEM_IDENTIFIER_ENUM["practice_region"] && i.value)) {
                                s = (i.value).split(":")[1];
                                found = true;
                            };
                        });
                    };
                    return s;
                };
    for (org in orgsList) {
        if (orgsList[org].isTopLevel) {
            if (orgsList[org].children.length > 0) {
                if ($("#userOrgs legend[orgId='" + org + "']").length == 0 ) {
                    container.append("<legend orgId='" + org + "'>"+ i18next.t(orgsList[org].name) +"</legend><input class='tnth-hide' type='checkbox' name='organization' parent_org=\"true\" org_name=\"" + orgsList[org].name + "\" id='" + orgsList[org].id + "_org' state='" + getState(orgsList[org]) + "' value='"+orgsList[org].id+"' />");
                    parentOrgsCt++;
                };
            } else {
                if ($("#userOrgs label[id='org-label-"+ org + "']").length == 0) {
                    container.append('<label id="org-label-' + org + '" class="org-label"><input class="clinic" type="checkbox" name="organization" parent_org="true" id="' +  orgsList[org].id + '_org" state="' +  getState(orgsList[org]) + '" value="'+
                    orgsList[org].id +'"  data-parent-id="'+ orgsList[org].id +'"  data-parent-name="' + orgsList[org].name + '"/>' + i18next.t(orgsList[org].name) + '</label>');
                };
            };
        };
        // Fill in each child clinic
        if (orgsList[org].children.length > 0) {
            var childClinic = "";
            orgsList[org].children.forEach(function(item, index) {
                var _parentOrgId = item.parentOrgId;
                var _parentOrg = orgsList[_parentOrgId];
                var _isTopLevel = _parentOrg ? _parentOrg.isTopLevel : false;
                var state = getState(orgsList[_parentOrgId]);
                if ($("#userOrgs input[name='organization'][value='" + item.id + "']").length > 0) return true;

                if ($("#userOrgs input[name='organization'][value='" + item.id + "']").length > 0) return true;

                childClinic = '<div id="' + item.id + '_container" ' + (_isTopLevel ? (' data-parent-id="'+_parentOrgId+'"  data-parent-name="' + _parentOrg.name + '" ') : "") +' class="indent org-container">'

                if (orgsList[item.id].children.length > 0) {
                    childClinic += '<label id="org-label-' + item.id + '" class="org-label ' + (orgsList[item.parentOrgId].isTopLevel ? "text-muted": "text-muter") + '">' +
                    '<input class="clinic" type="checkbox" name="organization" id="' +  item.id + '_org"  state="' + state + '" value="'+
                    item.id +'"  ' +  (_isTopLevel ? (' data-parent-id="'+_parentOrgId+'"  data-parent-name="' + _parentOrg.name + '" ') : "") + '/>'+
                    i18next.t(item.name) +
                    '</label>';

                 } else {
                    childClinic += '<label id="org-label-' + item.id + '" class="org-label">' +
                    '<input class="clinic" type="checkbox" name="organization" id="' +  item.id + '_org" state="' + state + '" value="'+
                    item.id +'"  ' +  (_isTopLevel ? (' data-parent-id="'+_parentOrgId+'"  data-parent-name="' + _parentOrg.name + '" ') : "") + '/>'+
                    i18next.t(item.name) +
                    '</label>';
                };

                childClinic += '</div>';

                if ($("#" + _parentOrgId + "_container").length > 0) $("#" + _parentOrgId + "_container").append(childClinic);
                else container.append(childClinic);

            });
        };
        if (parentOrgsCt > 0 && orgsList[org].isTopLevel) container.append("<span class='divider'>&nbsp;</span>");
    };
    if (!hasValue(container.text())) container.html("No organizations available");
};
OrgTool.prototype.getDefaultModal = function(o) {
        if (!o) return false;
        var orgId = this.getElementParentOrg(o), orgName = $(o).attr("data-parent-name");
        if (hasValue(orgId) && $("#" + orgId + "_defaultConsentModal").length == 0) {
            var s = '<div class="modal fade" id="' + orgId + '_defaultConsentModal" tabindex="-1" role="dialog" aria-labelledby="' + orgId + '_defaultConsentModal">'
                + '<div class="modal-dialog" role="document">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="' + i18next.t("Close") + '">' + "<span aria-hidden='true'>&times;</span></button>" +
                '<h4 class="modal-title">' + i18next.t("Consent to share information") + '</h4>' +
                '</div>' +
                '<div class="modal-body">' +
                '<h4>Terms</h4>' +
                '<p>' + i18next.t("I consent to sharing information with") +
                '<span class="consent-clinic-name">&nbsp;' + i18next.t(orgName) +
                '</p>' +
                '<div id="' + orgId + 'defaultConsentAgreementRadioList" class="profile-radio-list">' +
                '<label class="radio-inline">' +
                '<input type="radio" name="toConsent" id="' + orgId + '_consent_yes" data-org="' + orgId + '" value="yes"/>' + i18next.t("Yes") + '</label>' +
                '<br/>' +
                '<label class="radio-inline">' +
                '<input type="radio" name="toConsent" id="' + orgId + '_consent_no" data-org="' + orgId + '"  value="no"/>' + i18next.t("No") + '</label>' +
                '</div>' +
                '<div id="' + orgId + '_consentAgreementMessage" class="error-message"></div>' +
                '</div>' +
                '<br/>' +
                '<div class="modal-footer" >' +
                '<div id="' + orgId + '_loader" class="loading-message-indicator"><i class="fa fa-spinner fa-spin fa-2x"></i></div>' +
                '<button type="button" class="btn btn-default btn-consent-close" data-org="' + orgId + '" data-dismiss="modal" aria-label="' + i18next.t("Close") + '">' + i18next.t("Close") + '</button>' +
                '</div></div></div></div>';
            if ($("#defaultConsentContainer").length == 0) $("body").append("<div id='defaultConsentContainer'></div>");
            $("#defaultConsentContainer").append(s);
            $("#" + orgId + "_defaultConsentModal input[name='toConsent']").each(function() {
                $(this).on("click", function(e) {
                    e.stopPropagation();
                    var orgId = $(this).attr("data-org");
                    var userId = OT.getUserId();
                    $("#" + orgId + "_defaultConsentModal button.btn-consent-close, #" + orgId + "_defaultConsentModal button[data-dismiss]").attr("disabled", true);
                    $("#" + orgId + "_loader").show();
                    if ($(this).val() == "yes") {
                        setTimeout("tnthAjax.setDefaultConsent(" + userId + "," +  orgId + ");", 100);
                    } else {
                        tnthAjax.deleteConsent(userId, {"org":orgId});
                        setTimeout("tnthAjax.removeObsoleteConsent();", 100);
                    }
                    if (typeof reloadConsentList != "undefined") setTimeout("reloadConsentList();", 500);
                    setTimeout('$(".modal").modal("hide");', 250);
                });
             });
             $(document).delegate("#" + orgId + "_defaultConsentModal button[data-dismiss]", "click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                setTimeout("location.reload();", 10);
             });
             $("#" + orgId + "_defaultConsentModal").on("hidden.bs.modal", function() {
                if ($(this).find("input[name='toConsent']:checked").length > 0) {
                    $("#userOrgs input[name='organization']").each(function() {
                        $(this).removeAttr("data-require-validate");
                    });
                    var userId = OT.getUserId();
                    assembleContent.demo(userId ,true, $("#userOrgs input[name='organization']:checked"), true);
                };
             }).on("shown.bs.modal", function() {
                $(this).find("button.btn-consent-close, button[data-dismiss]").attr("disabled", false).show();
                $(this).find(".loading-message-indicator").hide();
                $(this).find("input[name='toConsent']").each(function(){
                    $(this).prop("checked", false);
                });
             });
        };
        return $("#" + orgId + "_defaultConsentModal");
};
OrgTool.prototype.handlePreSelectedClinic = function() {
    if ((typeof preselectClinic != "undefined") && hasValue(preselectClinic)) {
        var ob = $("#userOrgs input[value='"+preselectClinic+"']");
        if (ob.length > 0) {
            ob.prop("checked", true);
            var parentOrg = this.getElementParentOrg(this.getSelectedOrg());
            var userId = this.getUserId();
            if (!tnthAjax.hasConsent(userId, parentOrg)) {
                var __modal = OT.getConsentModal();
                if (__modal) {
                    ob.attr("data-require-validate", "true");
                     __modal.on("hidden.bs.modal", function() {
                        if ($(this).find("input[name='toConsent']:checked").length > 0) {
                              $("#userOrgs input[name='organization']").each(function() {
                                $(this).removeAttr("data-require-validate");
                              });
                        };
                    });
                } else {
                    tnthAjax.setDefaultConsent(userId, parentOrg);
                };
            };
            var stateContainer = ob.closest(".state-container");
            if (stateContainer.length > 0) {
                var st = stateContainer.attr("state");
                if (hasValue(st)) {
                    $("#stateSelector").find("option[value='" + st + "']").prop("selected", true).val(st);
                    stateContainer.show();
                };
            };
        };
    };
};
OrgTool.prototype.getSelectedOrg = function() {
    return $("#userOrgs input[name='organization']:checked");
};
OrgTool.prototype.getConsentModal = function(parentOrg) {
    if (!hasValue(parentOrg)) {
        parentOrg = this.getElementParentOrg(this.getSelectedOrg());
    };
    if (hasValue(parentOrg)) {
        var __modal = $("#" + parentOrg + "_consentModal");
        if (__modal.length > 0) return __modal;
        else {
            var __defaultModal = this.getDefaultModal(this.getSelectedOrg());
            if (__defaultModal && __defaultModal.length > 0) return __defaultModal;
            else return false;
        };
    } else return false;
};
OrgTool.prototype.handleEvent = function() {
    getSaveLoaderDiv("profileForm", "userOrgs");
    $("#userOrgs input[name='organization']").each(function() {
        $(this).attr("data-save-container-id", "userOrgs");
        $(this).on("click", function(e) {
            var userId = OT.getUserId();
            var parentOrg = OT.getElementParentOrg(this);
            if ($(this).prop("checked")){
                if ($(this).attr("id") !== "noOrgs") {
                    $("#noOrgs").prop('checked',false);
                    if ($("#btnProfileSendEmail").length > 0) $("#btnProfileSendEmail").attr("disabled", false);
                } else {
                    $("#userOrgs input[name='organization']").each(function() {
                        //console.log("in id: " + $(this).attr("id"))
                       if ($(this).attr("id") !== "noOrgs") {
                            $(this).prop('checked',false);
                       } else {
                            if (typeof sessionStorage != "undefined" && sessionStorage.getItem("noOrgModalViewed")) sessionStorage.removeItem("noOrgModalViewed");
                       };
                    });
                    if ($("#btnProfileSendEmail").length > 0) $("#btnProfileSendEmail").attr("disabled", true);
                };

            } else {
                var isChecked = $("#userOrgs input[name='organization']:checked").length > 0;
                if (!isChecked) {
                    //do not attempt to update if all orgs are unchecked for staff/staff admin
                    var isStaff = false;
                     $("#rolesGroup input[name='user_type']").each(function() {
                        if (!isStaff && ($(this).is(":checked") && ($(this).val() == "staff" || $(this).val() == "staff_admin"))) {
                            $("#userOrgs .help-block").addClass("error-message").text(i18next.t("Cannot ununcheck.  A staff member must be associated with an organization"));
                            isStaff = true;
                        };
                     });
                     if (!isStaff) $("#userOrgs .help-block").removeClass("error-message").text("");
                     else return false;
                    if (typeof sessionStorage != "undefined" && sessionStorage.getItem("noOrgModalViewed")) sessionStorage.removeItem("noOrgModalViewed");
                };
            };
            setTimeout(function() { tnthAjax.getOptionalCoreData(userId, false, $(".profile-item-container[data-sections='detail']")); }, 100);

            $("#userOrgs .help-block").removeClass("error-message").text("");

            if ($(this).attr("id") !== "noOrgs" && $("#fillOrgs").attr("patient_view")) {
                if (tnthAjax.hasConsent(userId, parentOrg)) {
                    assembleContent.demo(userId,true, $(this), true);
                } else {
                    var __modal = OT.getConsentModal();
                    if (__modal.length > 0) __modal.modal("show");
                    else {
                        tnthAjax.setDefaultConsent(userId, parentOrg);
                        assembleContent.demo(userId,true, $(this), true);
                    };
                };
            }
            else {
                assembleContent.demo(userId,true, $(this), true);
                if (typeof reloadConsentList != "undefined") reloadConsentList();
                tnthAjax.handleConsent($(this));
            };
            if ($("#locale").length > 0) {
                tnthAjax.getLocale(userId);
            }
        });
    });
};
OrgTool.prototype.getCommunicationArray = function() {
    var arrCommunication = [];
    $('#userOrgs input:checked').each(function() {
        if ($(this).val() == 0) return true; //don't count none
        var oList = OT.getOrgsList();
        var oi = oList[$(this).val()];
        if (!oi) return true;
        if (oi.language) {
            arrCommunication.push({"language": {"coding":[{
            "code": oi.language,
            "system": "urn:ietf:bcp:47"
            }]}});
        }
        else if (oi.extension && oi.extension.length > 0) {
            (oi.extension).forEach(function(ex) {
                if (ex.url == "http://hl7.org/fhir/valueset/languages" && ex.valueCodeableConcept.coding) arrCommunication.push({"language": {"coding":ex.valueCodeableConcept.coding}});
            });
        };
    });
    if (arrCommunication.length == 0) {
        var defaultLocale = $("#sys_default_locale").val();
        if (hasValue(defaultLocale)) arrCommunication.push({"language": {"coding":[{
            "code": defaultLocale,
            "display":$("#locale").find("option[value='" + defaultLocale + "']").text(),
            "system": "urn:ietf:bcp:47"
        }]}});

    };
    return arrCommunication;
};
OrgTool.prototype.getUserTopLevelParentOrgs = function(uo) {
  var parentList = [], self = this;
  if (uo) {
    uo.forEach(function(o) {
      var p = self.getTopLevelParentOrg(o);
      if (p && !self.inArray(p, parentList))  {
        parentList.push(p);
      };
    });
    return parentList;
  } else return false;
};
OrgTool.prototype.getTopLevelParentOrg = function(currentOrg) {
  if (!currentOrg) return false;
  var ml = this.getOrgsList(), self = this;
  if (ml && ml[currentOrg]) {
    if (ml[currentOrg].isTopLevel) {
      return currentOrg;
    } else {
      if (ml[currentOrg].parentOrgId) return self.getTopLevelParentOrg(ml[currentOrg].parentOrgId);
      else return currentOrg;
    };
  } else return false;
};
OrgTool.prototype.getChildOrgs = function(orgs, orgList) {
    if (!orgs || (orgs.length == 0)) {
      return orgList;
    } else {
      if (!orgList) orgList = [];
      var mainOrgsList = this.getOrgsList();
      var childOrgs = [];
      orgs.forEach(function(org) {
          var o = mainOrgsList[org.id];
          if (o) {
            orgList.push(org.id);
            var c  = o.children ? o.children : null;
            if (c && c.length > 0) {
                c.forEach(function(i) {
                  childOrgs.push(i);
                });
            };
          };
      });
      return this.getChildOrgs(childOrgs, orgList);
    };
};
OrgTool.prototype.getHereBelowOrgs = function(userOrgs) {
  var mainOrgsList = this.getOrgsList(), self = this;
  var here_below_orgs = [];
  if (!userOrgs) {
    var selectedOrg = this.getSelectedOrg();
    if (selectedOrg.length > 0) {
        userOrgs = [];
        selectedOrg.each(function() {
            userOrgs.push($(this).val());
        });
    };
  };
  if (userOrgs) {
      userOrgs.forEach(function(orgId) {
          here_below_orgs.push(orgId);
          var co = mainOrgsList[orgId];
          var cOrgs = self.getChildOrgs((co && co.children ? co.children : null));
          if (cOrgs && cOrgs.length > 0) {
            here_below_orgs = here_below_orgs.concat(cOrgs);
          };
      });
  };
  return here_below_orgs;
};
OrgTool.prototype.morphPatientOrgs = function() {
    var checkedOrgs = {};
    var orgs = $("#userOrgs input[name='organization']");
    orgs.each(function() {
        if ($(this).prop("checked")) {
            checkedOrgs[$(this).val()] = true;
        };
        $(this).attr("type", "radio");
        if (checkedOrgs[$(this).val()]) {
            $(this).prop("checked", true);
        };
    });
};

var OT = new OrgTool();

var tnthAjax = {
    "beforeSend": function() {
        $.ajaxSetup({
            beforeSend: function(xhr, settings) {
                if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", __CRSF_TOKEN);
                }
            }
        });
    },
    "reportError": function(userId, page_url, message, sync) {
        //params need to contain the following:
        //:subject_id: User on which action is being attempted
        //:message: Details of the error event
        //:page_url: The page requested resulting in the error
        var params = {};
        params.subject_id = hasValue(userId)? userId : 0;
        params.page_url = hasValue(page_url) ? page_url: window.location.href;
        params.message = hasValue(message) ? i18next.t(message) : i18next.t("Not provided");

        $.ajax ({
            type: "GET",
            url: "/report-error",
            contentType: "application/json; charset=utf-8",
            cache: false,
            async: (sync ? false : true),
            data: params
        }).done(function(data) {
        }).fail(function(){
        });
    },
    "getStillNeededCoreData": function(userId, sync, callback, entry_method) {
        if (!hasValue(userId)) return false;
        $.ajax ({
            type: "GET",
            url: "/api/coredata/user/" + userId + "/still_needed" + (hasValue(entry_method)?"?entry_method="+(entry_method).replace(/\_/g, " "):""),
            async: (sync ? false : true)
        }).done(function(data) {
            if (data && data.still_needed) {
                var __localizedFound = false;
                if ((data.still_needed).length > 0) $("#termsText").show();
                (data.still_needed).forEach(function(item) {
                    if ($.inArray(item, ["website_terms_of_use","subject_website_consent","privacy_policy"]) != -1) {
                        $("#termsCheckbox [data-type='terms']").each(function() {
                            var dataTypes = ($(this).attr("data-core-data-type")).split(","), self = $(this);
                            dataTypes.forEach(function(type) {
                                if ($.trim(type) == $.trim(item)) {
                                    self.show().removeClass("tnth-hide");
                                    self.attr("data-required", "true");
                                };
                            });
                            /*
                             * need to check terms of use types e.g. privacy policy, that is required of user
                             * in addition to website terms of use
                             * note, in eproms, website terms of use and privacy policy terms share the same checkbox, therefore
                             * for the purpose of checking, they need to be broken up into sub items and be checked respectively
                             */
                            $(this).find("[data-core-data-subtype]").each(function() {
                                 if ($.trim($(this).attr("data-core-data-subtype")) == $.trim(item)) {
                                    var parentNode = $(this).closest("[data-type='terms']");
                                    parentNode.show().removeClass("tnth-hide");
                                    parentNode.attr("data-required", "true");
                                 };
                            });
                        });
                    };
                    if (item == "localized") __localizedFound = true;
                });
                if (!__localizedFound) $("#patMeta").remove();
                else $("#patientQ").show();
                if (callback) callback(data.still_needed);
            } else {
                if (callback) {
                    callback({"error": i18next.t("no data returned")});
                };
            };
        }).fail(function(){
            if (callback) callback({"error": i18next.t("unable to get needed core data")});
        });
    },
    "getRequiredCoreData": function(userId, sync, callback) {
        if (!hasValue(userId)) return false;
        $.ajax ({
            type: "GET",
            url: "/api/coredata/user/" + userId + "/required",
            cache: false,
            async: (sync ? false : true)
        }).done(function(data) {
            if (data && data.required) {
                if (callback) callback(data.still_needed);
            } else {
                if (callback) callback({"error": i18next.t("no data returned")});
            };
        }).fail(function(){
            if (callback) callback({"error": i18next.t("unable to get required core data")});
        });
    },
    "getOptionalCoreData": function(userId, sync, target, callback, entry_method) {
        if (!hasValue(userId)) return false;
        if (target) {
            target.find(".profile-item-loader").show();
        };
        $.ajax ({
            type: "GET",
            url: "/api/coredata/user/" + userId + "/optional" + (hasValue(entry_method)?"?entry_method="+(entry_method).replace(/\_/g, " "):""),
            async: (sync ? false : true)
        }).done(function(data) {
            if (data && data.optional) {
                var self = this;
                var sections = $("#profileForm .optional");
                sections.each(function() {
                    var section = $(this).attr("data-section-id");
                    var parent = $(this).closest(".profile-item-container");
                    var visibleRows = parent.find(".view-container tr:visible").length;
                    var noDataContainer = parent.find(".no-data-container");
                    var btn = parent.find(".profile-item-edit-btn").hide();
                    if (hasValue(section)) {
                        if (OT.inArray(section, data.optional)) {
                            $(this).show();
                            noDataContainer.html("");
                            btn.show();
                        } else {
                            $(this).hide();
                            if (visibleRows == 0) {
                                noDataContainer.html("<p class='text-muted'>" + i18next.t("No information available") + "</p>");
                                btn.hide();
                            };
                        };
                    };
                });
                if (callback) callback(data);
            } else {
                if (callback) callback({"error": i18next.t("no data found")});
            };
            if (target) {
                target.find(".profile-item-loader").hide();
            };
        }).fail(function(){
            if (callback) callback({"error": i18next.t("unable to get required core data")});
            if (target) {
                target.find(".profile-item-loader").hide();
            };
        });
    },
    "getPortalFooter": function(userId, sync, containerId, callback) {
        if (!userId) {
            if (callback) callback("<div class='error-message'>" + i18next.t("User Id is required") + "</div>");
            return false;
        };
        $.ajax ({
            type: "GET",
            url: '/api/portal-footer-html/',
            async: sync? false : true
        }).done(function(data) {
            if (data) {
                if (hasValue(containerId)) $("#" + containerId).html(data);
                if (callback) callback(data);
            } else {
                if (callback) callback("<div class='error-message'>" + i18next.t("No data found") + "</div>");
            }
        }).fail(function() {
           if (callback) callback("<div class='error-message'>" + i18next.t("Unable to retrieve portal footer html") + "</div>");
        });

    },
    "getOrgs": function(userId, noOverride, sync, callback, noPopulate) {
        loader(true);
        var self = this;
        $.ajax ({
            type: "GET",
            url: '/api/organization',
            async: sync? false : true
        }).done(function(data) {
            OT.setUserId(userId);
            $(".get-orgs-error").html("");
            OT.populateOrgsList(data.entry);
            if(!noPopulate) {
                OT.handlePreSelectedClinic();
                OT.populateUI();
                OT.handleEvent();
            };
            if (callback) callback(data);
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
           var errorMessage = i18next.t("Server error occurred retrieving organization/clinic information.");
           if ($(".get-orgs-error").length == 0) $(".default-error-message-container").append("<div class='get-orgs-error error-message'>" + errorMessage + "</div>");
           else $(".get-orgs-error").html(errorMessage);
           if (callback) callback({"error": errorMessage});
           loader();
        });
    },
    "getConsent": function(userId, sync) {
       if (!userId) return false;
       $.ajax ({
            type: "GET",
            url: '/api/user/'+userId+"/consent",
            cache: false,
            async: (sync ? false : true)
        }).done(function(data) {
           $(".get-consent-error").html("");
           fillContent.consentList(data, userId, null, null);
           loader();
           return true;
        }).fail(function(xhr) {
            //console.log("Problem retrieving data from server.");
            fillContent.consentList(null, userId, i18next.t("Problem retrieving data from server.") + "<br/>" + i18next.t("Error Status Code: ") + xhr.status + (xhr.status == 401 ? "<br/>" + i18next.t("Permission denied to access patient record"): ""), xhr.status);
            loader();
            var errorMessage = i18next.t("Server error occurred retrieving consent information.");
            if ($(".get-consent-error").length == 0) $(".default-error-message-container").append("<div class='get-consent-error error-message'>" + errorMessage + "</div>");
            else $(".get-consent-error").html(errorMessage)
            return false;
        });
    },
    "setConsent": function(userId, params, status, sync, callback) {
        if (userId && params) {
            var consented = this.hasConsent(userId, params["org"], status);
            if (!consented || params["testPatient"]) {
                params["user_id"] = userId;
                params["organization_id"] = params["org"];
                params["agreement_url"] =  params["agreementUrl"]
                params["staff_editable"] = (hasValue(params["staff_editable"])? params["staff_editable"] : false);
                params["include_in_reports"] =  (hasValue(params["include_in_reports"]) ? params["include_in_reports"] : false);
                params["send_reminders"] = (hasValue(params["send_reminders"]) ? params["send_reminders"] : false);

                $.ajax ({
                    type: "POST",
                    url: '/api/user/' + userId + '/consent',
                    contentType: "application/json; charset=utf-8",
                    cache: false,
                    dataType: 'json',
                    async: (sync? false: true),
                    data: JSON.stringify(params)
                }).done(function(data) {
                    //console.log("consent updated successfully.");
                    $(".set-consent-error").html("");
                    if (callback) callback(data);
                }).fail(function(xhr) {
                    //console.log("request to updated consent failed.");
                    //console.log(xhr.responseText)
                    if (callback) callback({"error": xhr.responseText});
                    var errorMessage = i18next.t("Server error occurred setting consent status.");
                    if ($(".set-consent-error").length == 0) $(".default-error-message-container").append("<div class='set-consent-error error-message'>" + errorMessage + "</div>");
                    else $(".set-consent-error").html(errorMessage);
                });
            };
        };
    },
    "setDefaultConsent": function(userId, orgId) {
        if (!hasValue(userId) && !hasValue(orgId)) return false;
        var stockConsentUrl = $("#stock_consent_url").val();
        var agreementUrl = "";
        if (hasValue(stockConsentUrl)) {
            agreementUrl = stockConsentUrl.replace("placeholder", encodeURIComponent($("#" + orgId + "_org").attr("data-parent-name")));
        };
        if (hasValue(agreementUrl)) {
            var params = CONSENT_ENUM["consented"];
            params.org = orgId;
            params.agreementUrl = agreementUrl;
            this.setConsent(userId, params, "default");
            //need to remove all other consents associated w un-selected org(s)
            setTimeout("tnthAjax.removeObsoleteConsent();", 100);
            if (typeof reloadConsentList != "undefined") reloadConsentList();
            $($("#consentContainer .error-message").get(0)).text("");
        } else {
            $($("#consentContainer .error-message").get(0)).text(i18next.t("Unable to set default consent agreement"));
        }
    },
    deleteConsent: function(userId, params) {
        if (userId && params) {
            var consented = this.getAllValidConsent(userId, params["org"]);
            //console.log("has consent: " + consented)
            if (consented) {
                //delete all consents for the org
                consented.forEach(function(orgId) {
                    if (hasValue(params["exclude"])) {
                        var arr = params["exclude"].split(",");
                        var found = false;
                        arr.forEach(function(o) {
                            if (!found) {
                                if (o == orgId) found = true;
                            };
                        });
                        if (found) return true;
                    };
                    $.ajax ({
                        type: "DELETE",
                        url: '/api/user/' + userId + '/consent',
                        contentType: "application/json; charset=utf-8",
                        async: false,
                        cache: false,
                        dataType: 'json',
                        data: JSON.stringify({"organization_id": parseInt(orgId)})
                    }).done(function(data) {
                        //console.log("consent deleted successfully.");
                        $(".delete-consent-error").html("");
                    }).fail(function(xhr) {
                        //console.log("request to delete consent failed.");
                        //console.log(xhr.responseText)
                        var errorMessage = i18next.t("Server error occurred removing consent.");
                        if ($(".delete-consent-error").length == 0) $(".default-error-message-container").append("<div class='delete-consent-error error-message'>" + errorMessage + "</div>");
                        else $(".delete-consent-error").html(errorMessage)
                    });
                });

            };
        };
    },
    getAllValidConsent: function(userId, orgId) {
        //console.log("in hasConsent: userId: " + userId + " parentOrg: " + parentOrg)
        if (!userId) return false;
        if (!orgId) return false;

        var consentedOrgIds = [];
        //console.log("in hasConsent: userId: " + userId + " parentOrg: " + parentOrg)
        $.ajax ({
            type: "GET",
            url: '/api/user/'+userId+"/consent",
            cache: false,
            async: false
        }).done(function(data) {
            if (data.consent_agreements) {
                var d = data["consent_agreements"];
                if (d.length > 0) {
                    d.forEach(function(item) {
                        //console.log("expired: " + item.expires + " dateDiff: " + tnthDates.getDateDiff(item.expires))
                        expired = item.expires ? tnthDates.getDateDiff(String(item.expires)) : 0;
                        if (!(item.deleted) && !(expired > 0)) {
                            if (orgId == "all") consentedOrgIds.push(item.organization_id);
                            else if (orgId == item.organization_id) consentedOrgIds.push(orgId);
                        };
                    });
                };
            };

        }).fail(function() {
            return false;
        });
        //console.log(consentedOrgIds)
        return consentedOrgIds;
    },

    /****** NOTE - this will return the latest updated consent entry *******/
    hasConsent: function(userId, orgId, filterStatus) {
        //console.log("in hasConsent: userId: " + userId + " orgId: " + orgId)
        if (!userId) return false;
        if (!orgId) return false;
        if (filterStatus == "default") return false;

        var consentedOrgIds = [], expired = 0, found = false, suspended = false;
        //console.log("in hasConsent: userId: " + userId + " parentOrg: " + parentOrg)
        $.ajax ({
            type: "GET",
            url: '/api/user/'+userId+"/consent",
            cache: false,
            async: false
        }).done(function(data) {
            if (data.consent_agreements) {
                var d = data["consent_agreements"];
                if (d.length > 0) {
                    d = d.sort(function(a,b){
                        return new Date(b.signed) - new Date(a.signed); //latest comes first
                    });
                    item = d[0];
                    expired = item.expires ? tnthDates.getDateDiff(String(item.expires)) : 0;
                    if (item.deleted) found = true;
                    if (expired > 0) found = true;
                    if (item.staff_editable && item.include_in_reports && !item.send_reminders) suspended = true;
                    if (!found) {
                        if (orgId == item.organization_id) {
                            //console.log("consented orgid: " + orgId)
                            switch(filterStatus) {
                                case "suspended":
                                    if (suspended) found = true;
                                    break;
                                case "purged":
                                    found = true;
                                    break;
                                case "consented":
                                    if (!suspended) {
                                        if (item.staff_editable && item.send_reminders && item.include_in_reports) found = true;
                                    };
                                    break;
                                default:
                                    found = true; //default is to return both suspended and consented entries
                            };
                            if (found) consentedOrgIds.push(orgId);

                        };
                    };
                }
            };

        }).fail(function() {
            return false;
         });
        //console.log(consentedOrgIds)
        return consentedOrgIds.length > 0 ? consentedOrgIds : null;
    },
    removeObsoleteConsent: function() {
        var userId = $("#fillOrgs").attr("userId");
        var co = [];
        $("#userOrgs input[name='organization']").each(function() {
            if ($(this).is(":checked")) {
                var po = OT.getElementParentOrg(this);
                co.push($(this).val());
                if (hasValue(po)) co.push(po);
            };
        });
        //exclude currently selected orgs
        tnthAjax.deleteConsent(userId, {org: "all", exclude: co.join(",")});
    },
    handleConsent: function(obj) {
        var self = this;
        $(obj).each(function() {
            var parentOrg = OT.getElementParentOrg(this);
            var orgId = $(this).val();
            var userId = $("#fillOrgs").attr("userId");
            if (!hasValue(userId)) userId = $("#userOrgs").attr("userId");

            var cto = (typeof CONSENT_WITH_TOP_LEVEL_ORG != "undefined") && CONSENT_WITH_TOP_LEVEL_ORG;
            if ($(this).prop("checked")){
                if ($(this).attr("id") !== "noOrgs") {
                    if (parentOrg) {
                        var agreementUrl = $("#" + parentOrg + "_agreement_url").val();
                        if (agreementUrl && agreementUrl != "") {
                            var params = CONSENT_ENUM["consented"];
                            params.org = cto ? parentOrg : orgId;
                            params.agreementUrl = agreementUrl;
                            setTimeout("tnthAjax.setConsent($('#fillOrgs').attr('userId')," + JSON.stringify(params) + ", 'all', true);", 0);
                            setTimeout("tnthAjax.removeObsoleteConsent();", 200);
                        } else {
                            if (cto) {
                                tnthAjax.setDefaultConsent(userId, parentOrg);
                            };
                        };
                    };

                } else {
                    var pOrg, prevOrg, currentOrg;
                    if (cto) {
                        var topLevelOrgs = OT.getTopLevelOrgs();
                        topLevelOrgs.forEach(function(i) {
                            if (i != orgId) setTimeout("tnthAjax.deleteConsent($('#fillOrgs').attr('userId')," + JSON.stringify({"org": i}) + ");", 0);
                        });

                    } else {
                        //delete all orgs
                        $("#userOrgs").find("input[name='organization']").each(function() {
                            setTimeout("tnthAjax.deleteConsent($('#fillOrgs').attr('userId')," + JSON.stringify({"org": $(this).val()}) + ");", 0);
                        });
                    };
                };
            } else {
                //delete only when all the child orgs from the parent org are unchecked as consent agreement is with the parent org
                if (cto) {
                    var childOrgs = $("#userOrgs div.org-container[data-parent-id='" + parentOrg + "']").find("input[name='organization']");
                    var allUnchecked = true;
                    childOrgs.each(function() {
                        if ($(this).prop("checked")) allUnchecked = false;
                    });
                    if (allUnchecked && childOrgs.length > 0) {
                        if (parentOrg != orgId) setTimeout("tnthAjax.deleteConsent($('#fillOrgs').attr('userId')," + JSON.stringify({"org": parentOrg}) + ");", 0);
                    };
                } else {
                    setTimeout("tnthAjax.deleteConsent($('#fillOrgs').attr('userId')," + JSON.stringify({"org": orgId}) + ");", 0);
                };
            };
        });
    },
    "getDemo": function(userId, noOverride, sync, callback) {
        $.ajax ({
            type: "GET",
            url: '/api/demographics/'+userId,
            async: (sync ? false: true),
            cache: false
        }).done(function(data) {
            if (!noOverride) {
                fillContent.race(data);
                fillContent.ethnicity(data);
                fillContent.indigenous(data);
                fillContent.orgs(data);
                fillContent.demo(data);
                fillContent.timezone(data);
                fillContent.subjectId(data);
                fillContent.siteId(data);
                fillContent.language(data);
            }
            $(".get-demo-error").html("");
            loader();
            if (callback) callback();
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
            loader();
            if (callback) callback();
            var errorMessage = i18next.t("Server error occurred retrieving demographics information.");
            if ($(".get-demo-error").length == 0) $(".default-error-message-container").append("<div class='get-demo-error error-message'>" + errorMessage + "</div>");
            else $(".get-demo-error").html(errorMessage);
        });
    },
    "putDemo": function(userId,toSend,targetField, sync) {
        flo.showLoader(targetField);
        $.ajax ({
            type: "PUT",
            url: '/api/demographics/'+userId,
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            async: (sync ? false: true),
            data: JSON.stringify(toSend)
        }).done(function(data) {
            //console.log("done");
            //console.log(data);
            $(".put-demo-error").html("");
            flo.showUpdate(targetField);
            fillViews.demo();
            fillViews.detail();
            fillViews.org();
        }).fail(function() {
            var errorMessage = i18next.t("Server error occurred setting demographics information.");
            if ($(".put-demo-error").length == 0) $(".default-error-message-container").append("<div class='put-demo-error error-message'>" + errorMessage + "</div>");
            else $(".put-demo-error").html(errorMessage);
            flo.showError(targetField);
        });
    },
    "getDob": function(userId) {
        $.ajax ({
            type: "GET",
            url: '/api/demographics/'+userId
        }).done(function(data) {
            fillContent.dob(data);
            //console.log(data)
            loader();
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
            loader();
        });
    },
    "getName": function(userId) {
        $.ajax ({
            type: "GET",
            url: '/api/demographics/'+userId
        }).done(function(data) {
            fillContent.name(data);
            loader();
        }).fail(function() {
            loader();
        });
    },
    "getLocale": function(userId) {
        $.ajax ({
                type: "GET",
                url: '/api/demographics/'+userId,
                cache: false
        }).done(function(data) {
            if (data && data.communication) {
                data.communication.forEach(function(item, index) {
                    if (item.language) {
                        locale = item["language"]["coding"][0].code;
                        $("#locale").find("option").each(function() {
                            $(this).removeAttr("selected");
                        });
                        $("#locale").find("option[value='" + locale + "']").attr("selected", "selected");
                        $("#locale").val(locale);
                        fillViews.locale();
                    };
                });
                $(".get-locale-error").html("");
            };

        }).fail(function() {
            var errorMessage = i18next.t("Server error occurred retrieving locale information.");
            if ($(".get-locale-error").length == 0) $(".default-error-message-container").append("<div class='get-locale-error error-message'>" + errorMessage + "</div>");
            else $(".get-locale-error").html(errorMessage);
        });
    },
    "hasTreatment": function(data) {
        var found = false;
        if (data && data.entry && data.entry.length > 0) {
            // sort from newest to oldest based on lsat updated date
            data.entry = data.entry.sort(function(a,b){
                return new Date(b.resource.meta.lastUpdated) - new Date(a.resource.meta.lastUpdated);
            });
            var found = false;
            (data.entry).forEach(function(item) {
                //console.log(item.resource.code.coding[0].code +  " " + item.resource.performedDateTime)
                if (!found) {
                    var resourceItemCode = item.resource.code.coding[0].code;
                    var system = item.resource.code.coding[0].system;
                    var procId = item.resource.id;

                   // console.log(resourceItemCode)
                   if ((resourceItemCode == CANCER_TREATMENT_CODE && (system == SNOMED_SYS_URL)) || (resourceItemCode == NONE_TREATMENT_CODE && (system == CLINICAL_SYS_URL))) {
                        found = {"code": resourceItemCode, "id": procId};
                    }

                };
            });
        };

        return found;
    },
    "getTreatment": function (userId) {
        if (!userId) return false;
        $.ajax ({
            type: "GET",
            url: '/api/patient/'+userId+'/procedure',
            cache: false
        }).done(function(data) {
            fillContent.treatment(data);
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
           $("#userProcedures").html("<span class='error-message'>" + i18next.t("Error retrieving data from server") + "</span>");
        });
    },
    "postTreatment": function(userId, started, treatmentDate, targetField) {
        if (!userId) return false;
        tnthAjax.deleteTreatment(userId, targetField);
        var code = NONE_TREATMENT_CODE;
        var display = "None";
        var system = CLINICAL_SYS_URL;

        if (started) {
            code = CANCER_TREATMENT_CODE;
            display = "Procedure on prostate";
            system = SNOMED_SYS_URL;

        };

        if (!hasValue(treatmentDate)) {
            var date = new Date();
            //in yyyy-mm-dd format
            treatmentDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        };

        var procID = [{ "code": code, "display": display, "system": system }];
        var procArray = {};

        procArray["resourceType"] = "Procedure";
        procArray["subject"] = {"reference": "Patient/" + userId};
        procArray["code"] = {"coding": procID};
        procArray["performedDateTime"] = treatmentDate ? treatmentDate: "";

        tnthAjax.postProc(userId, procArray, targetField);
    },
    deleteTreatment: function(userId, targetField) {
        var self = this;
        $.ajax ({
            type: "GET",
            url: '/api/patient/'+userId+'/procedure',
            async: false
        }).done(function(data) {
            var treatmentData = self.hasTreatment(data);
            if (treatmentData) {
                if (treatmentData.code == CANCER_TREATMENT_CODE) {
                    tnthAjax.deleteProc(treatmentData.id, targetField, true);
                } else {
                    tnthAjax.deleteProc(treatmentData.id, targetField, true);
                };
            };
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
        });
    },
    "getProc": function(userId,newEntry) {
        $.ajax ({
            type: "GET",
            url: '/api/patient/'+userId+'/procedure',
            cache: false
        }).done(function(data) {
            $("#eventListLoad").hide();
            fillContent.proceduresContent(data,newEntry);
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
        });
    },
    "postProc": function(userId,toSend, targetField) {
        flo.showLoader(targetField);
        $.ajax ({
            type: "POST",
            url: '/api/procedure',
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify(toSend)
        }).done(function(data) {
            flo.showUpdate(targetField);
            $(".get-procs-error").html("");
        }).fail(function() {
           // console.log("Problem updating procedure on server.");
           var errorMessage = i18next.t("Server error occurred saving procedure/treatment information.");
            if ($(".get-procs-error").length == 0) $("#userProcuedures").append("<div class='get-procs-error error-message'>" + errorMessage + "</div>");
            else $(".get-procs-error").html(errorMessage);
            flo.showError(targetField);
        });
    },
    "deleteProc": function(procedureId, targetField, sync) {
        flo.showLoader(targetField);
        $.ajax ({
            type: "DELETE",
            url: '/api/procedure/'+procedureId,
            contentType: "application/json; charset=utf-8",
            async: (sync ? false: true)
        }).done(function(data) {
            flo.showUpdate(targetField);
            $(".del-procs-error").html("");
        }).fail(function() {
            // console.log("Problem deleting procedure on server.");
            var errorMessage = i18next.t("Server error occurred removing procedure/treatment information.");
            if ($(".del-procs-error").length == 0) $("#userProcuedures").append("<div class='del-procs-error error-message'>" + errorMessage + "</div>");
            else $(".del-procs-error").html(errorMessage);
            flo.showError(targetField);
        });
    },
    "getRoleList": function(callback) {
        $.ajax({
            type: "GET",
            url: "/api/roles"
        }).done(function(data) {
            fillContent.roleList(data);
            if (callback) callback();
        }).fail(function() {
            $(".get-roles-error").html(i18next.t("Server error occurred retrieving roles information."));
        });
    },
    "getRoles": function(userId,isProfile) {
        var self = this;
        $.ajax ({
            type: "GET",
            url: '/api/user/'+userId+'/roles',
            cache: false
        }).done(function(data) {
            //self.getRoleList();
            $(".get-roles-error").html("");
            fillContent.roles(data,isProfile);
        }).fail(function() {
           // console.log("Problem retrieving data from server.");
           var errorMessage = i18next.t("Server error occurred retrieving user role information.");
           if ($(".get-roles-error").length == 0) $(".default-error-message-container").append("<div class='get-roles-error error-message'>" + errorMessage + "</div>");
           else $(".get-roles-error").html(errorMessage);
        });
    },
    "putRoles": function(userId,toSend, targetField) {
        flo.showLoader(targetField);
        $.ajax ({
            type: "PUT",
            url: '/api/user/'+userId+'/roles',
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify(toSend)
        }).done(function(data) {
            flo.showUpdate(targetField);
            $(".put-roles-error").html("");
        }).fail(function(jhr) {
            flo.showError(targetField);
            var errorMessage = i18next.t("Server error occurred setting user role information.");
           if ($(".put-roles-error").length == 0) $(".default-error-message-container").append("<div class='put-roles-error error-message'>" + errorMessage + "</div>");
           else $(".put-roles-error").html(errorMessage);
           //console.log(jhr.responseText);
        });
    },
    "deleteRoles": function(userId,toSend) {
        $.ajax ({
            type: "DELETE",
            url: '/api/user/'+userId+'/roles',
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify(toSend)
        }).done(function(data) {
            $(".delete-roles-error").html("");
        }).fail(function() {
           // console.log("Problem updating role on server.");
           var errorMessage = i18next.t("Server error occurred deleting user role.");
           if ($(".delete-roles-error").length == 0) $(".default-error-message-container").append("<div class='delete-roles-error error-message'>" + errorMessage + "</div>");
           else $(".delete-roles-error").html(errorMessage);

        });
    },
    "getClinical": function(userId) {
        $.ajax ({
            type: "GET",
            url: '/api/patient/'+userId+'/clinical'
        }).done(function(data) {
            $(".get-clinical-error").html("");
            fillContent.clinical(data);
        }).fail(function() {
            var errorMessage = i18next.t("Server error occurred retrieving clinical data.");
           if ($(".get-clinical-error").length == 0) $(".default-error-message-container").append("<div class='get-clinical-error error-message'>" + errorMessage + "</div>");
           else $(".get-clinical-error").html(errorMessage);
        });
    },
    "putClinical": function(userId, toCall, toSend, targetField, status) {
        flo.showLoader(targetField);
        $.ajax ({
            type: "POST",
            url: '/api/patient/'+userId+'/clinical/'+toCall,
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify({value: toSend})
        }).done(function() {
            $(".put-clinical-error").html("");
            flo.showUpdate(targetField);
            fillViews.clinical();
        }).fail(function() {
            //alert("There was a problem saving your answers. Please try again.");
            var errorMessage = i18next.t("Server error occurred updating clinical data.");
            if ($(".put-clinical-error").length == 0) $(".default-error-message-container").append("<div class='put-clinical-error error-message'>" + errorMessage + "</div>");
            else $(".put-clinical-error").html(errorMessage);
            flo.showError(targetField);
            fillViews.clinical();
        });
    },
    "getObservationId": function(userId, code) {
        if (!hasValue(userId) && !hasValue(code)) return false;
        var obId = "", _code="";
        $.ajax ({
            type: "GET",
            url: '/api/patient/'+userId+'/clinical',
            cache: false,
            async: false
        }).done(function(data) {
            if (data && data.entry) {
                (data.entry).forEach(function(item) {
                    if (!hasValue(obId)) {
                        _code = item.content.code.coding[0].code;
                        if (_code == code) obId = item.content.id;
                    };
                });
            }

        }).fail(function() {
        });
        return obId;
    },
    "postClinical": function(userId, toCall, toSend, status, targetField, params) {
        flo.showLoader(targetField);
        if (!userId) return false;
        if (!params) params = {};
        var code = "";
        var display = "";
        switch(toCall) {
            case "biopsy":
                code = "111";
                display = "biopsy";
                break;
            case "pca_diag":
                code = "121";
                display = "PCa diagnosis";
                break;
            case "pca_localized":
                code = "141";
                display = "PCa localized diagnosis";
        };
        if (!hasValue(code)) return false;
        var system = CLINICAL_SYS_URL;
        var method = "POST";
        var url = '/api/patient/'+userId+'/clinical';
        var obsCode = [{ "code": code, "display": display, "system": system }];
        var obsArray = {};
        obsArray["resourceType"] = "Observation";
        obsArray["code"] = {"coding": obsCode};
        obsArray["issued"] = params.issuedDate ? params.issuedDate: "";
        obsArray["status"] = status ? status: "";
        obsArray["valueQuantity"] = {"units":"boolean", "value": toSend};
        if (params.performer) obsArray["performer"] = params.performer;
        var obsId = tnthAjax.getObservationId(userId, code);
        if (hasValue(obsId)) {
            method = "PUT";
            url = url + "/" + obsId;
        };
        $.ajax ({
            type: method,
            url: url,
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            cache: false,
            data: JSON.stringify(obsArray)
        }).done(function() {
            $(".post-clinical-error").html("");
            flo.showUpdate(targetField);
            fillViews.clinical();
        }).fail(function() {
            //alert("There was a problem saving your answers. Please try again.");
            var errorMessage = i18next.t("Server error occurred updating clinical data.");
            if ($(".post-clinical-error").length == 0) $(".default-error-message-container").append("<div class='post-clinical-error error-message'>" + errorMessage + "</div>");
            else $(".post-clinical-error").html(errorMessage);
            flo.showError(targetField);
            fillViews.clinical();
        });
    },
    "getTermsUrl": function(sync, callback) {
        $.ajax ({
            type: "GET",
            url: '/api/tou',
            async: (sync? false: true)
        }).done(function(data) {
            $(".get-tou-error").html("");
            if (data.url) {
                $("#termsURL").attr("data-url", data.url);
                $("#topTerms .general-tou").each(function() {
                    $(this).attr("data-url", data.url);
                });
                if (callback) callback({"url": data.url});
            } else {
                if (callback) callback({"error": i18next.t("no url returned")});
            }
            //fillContent.terms(data);
        }).fail(function() {
           var errorMessage = i18next.t("Server error occurred retrieving tou url.");
           if ($(".get-tou-error").length == 0) $(".default-error-message-container").append("<div class='get-tou-error error-message'>" + errorMessage + "</div>");
           else $(".get-tou-error").html(errorMessage);
           if (callback) callback({"error": i18next.t("Server error")});
        });
    },
    /*
     *  return instruments list by organization(s)
     */
    "getInstrumentsList": function(sync, callback) {
        $.ajax({
            type: "GET",
            url: "api/questionnaire_bank",
            async: (sync?false:true)
        }).done(function(data){
            if (data && data.entry) {
                if ((data.entry).length === 0) {
                    if (callback) callback({"error": i18next.t("no data returned")});
                } else {
                    var qList = {};
                    (data.entry).forEach(function(item) {
                        if (item.organization) {
                            var orgID = (item.organization.reference).split("/")[2];
                            /*
                             * don't assign orgID to object if it was already present
                             */
                            if (!qList[orgID]) qList[orgID] = [];
                            if (item.questionnaires) {
                                (item.questionnaires).forEach(function(q) {
                                    /*
                                     * add instrument name to instruments array for the org
                                     * will not add if it is already in the array
                                     * NOTE: inArray returns -1 if the item is NOT in the array
                                     */
                                    if ($.inArray(q.questionnaire.display, qList[orgID]) == -1){
                                        qList[orgID].push(q.questionnaire.display);
                                    };
                                });
                            };
                        };
                    });
                    if (callback) callback(qList);
                };
            } else {
                if (callback) callback({"error": i18next.t("no data returned")});
            };

        }).fail(function() {
            if (callback) callback({"error": i18next.t("error retrieving instruments list")});
        });
    },
    "getTerms": function(userId, type, sync, callback) {
        $.ajax ({
            type: "GET",
            url: '/api/user/'+userId+'/tou'+(hasValue(type)?("/"+type):""),
            cache: false,
            async: (sync?false:true)
        }).done(function(data) {
            $(".get-tou-error").html("");
            fillContent.terms(data);
            if (callback) callback(data);
        }).fail(function() {
           var errorMessage = i18next.t("Server error occurred retrieving tou data.");
           if ($(".get-tou-error").length == 0) $(".default-error-message-container").append("<div class='get-tou-error error-message'>" + errorMessage + "</div>");
           else $(".get-tou-error").html(errorMessage);
           if (callback) callback({"error": errorMessage})
        });
    },
    "postTermsByUser": function(userId, toSend) {
        ///user/<user_id>/tou/accepted
        $.ajax ({
            type: "POST",
            url: '/api/user/' + userId + '/tou/accepted',
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify(toSend)
        }).done(function() {
           // console.log('terms stored');
           $(".post-tou-error").html("");
        }).fail(function() {
            //alert("There was a problem saving your answers. Please try again.");
            var errorMessage = i18next.t("Server error occurred saving terms of use information.");
            if ($(".post-tou-error").length == 0) $(".default-error-message-container").append("<div class='post-tou-error error-message'>" + errorMessage + "</div>");
            else $(".post-tou-error").html(errorMessage);
        });
    },
    "postTerms": function(toSend) {
        $.ajax ({
            type: "POST",
            url: '/api/tou/accepted',
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify(toSend)
        }).done(function() {
           // console.log('terms stored');
           $(".post-tou-error").html("");
        }).fail(function() {
            //alert("There was a problem saving your answers. Please try again.");
            var errorMessage = i18next.t("Server error occurred saving terms of use information.");
            if ($(".post-tou-error").length == 0) $(".default-error-message-container").append("<div class='post-tou-error error-message'>" + errorMessage + "</div>");
            else $(".post-tou-error").html(errorMessage);
        });
    }
};

function getIEVersion() {
    var match = navigator.userAgent.match(/(?:MSIE |Trident\/.*; rv:)(\d+)/);
    return match ? parseInt(match[1]) : undefined;
};

function newHttpRequest(url,callBack, noCache)
{
    attempts++;
    var xmlhttp;
    if (window.XDomainRequest)
    {
        xmlhttp=new XDomainRequest();
        xmlhttp.onload = function(){callBack(xmlhttp.responseText)};
    } else if (window.XMLHttpRequest) xmlhttp=new XMLHttpRequest();
    else xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    xmlhttp.onreadystatechange=function()
    {
        if (xmlhttp.readyState==4) {
            if (xmlhttp.status==200) {
                if (callBack) callBack(xmlhttp.responseText);
            } else {
                if (attempts < 3) setTimeout ( function(){ newHttpRequest(url,callBack, noCache); }, 3000 );
                else loader();
            };
        };
    };
    if (noCache) url = url + ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime();
    xmlhttp.open("GET",url,true);
    xmlhttp.send();
};

var attempts = 0;

funcWrapper = function() {
    attempts++;
    $.ajax({
        url: PORTAL_NAV_PAGE,
        type:'GET',
        contentType:'text/plain',
        timeout: 5000,
        cache: (getIEVersion() ? false : true)
    }, 'html')
    .done(function(data) {
        embed_page(data);
        //showSearch();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      //  console.log("Error loading nav elements from " + PORTAL_HOSTNAME);
        if (attempts < 3) {
            setTimeout ( function(){ funcWrapper( ) }, 3000 );
        } else loader();
    })
    .always(function() {
        loader();
        attempts = 0;
    });
};

$(document).ready(function() {

    if (typeof PORTAL_NAV_PAGE != 'undefined') {

        loader(true);

        var isIE = getIEVersion();
        if (isIE) {
            newHttpRequest(PORTAL_NAV_PAGE, embed_page, true);
        } else {
            funcWrapper();
        };
    } else loader();

    // Reveal footer after load to avoid any flashes will above content loads
    setTimeout('$("#homeFooter").show();', 100);

    tnthAjax.beforeSend();

    __NOT_PROVIDED_TEXT = i18next.t("not provided");

    //setTimeout('LRKeyEvent();', 1500);
    // To validate a form, add class to <form> and validate by ID.
    $('form.to-validate').validator({
        custom: {
            birthday: function($el) {
                var m = parseInt($("#month").val());
                var d = parseInt($("#date").val());
                var y = parseInt($("#year").val());
                // If all three have been entered, run check
                var goodDate = true;
                var errorMsg = "";
                // If NaN then the values haven't been entered yet, so we
                // validate as true until other fields are entered
                if (isNaN(y) || (isNaN(d) && isNaN(y))) {
                    $("#errorbirthday").html(i18next.t('All fields must be complete.')).hide();
                    goodDate = false;
                } else if (isNaN(d)) {
                    errorMsg = i18next.t("Please enter a valid date.");
                } else if (isNaN(m)) {
                    errorMsg += (hasValue(errorMsg)?"<br/>": "") + i18next.t("Please enter a valid month.");
                } else if (isNaN(y)) {
                    errorMsg += (hasValue(errorMsg)?"<br/>": "") + i18next.t("Please enter a valid year.");
                };

                if (hasValue(errorMsg)) {
                    $("#errorbirthday").html(errorMsg).show();
                    $("#birthday").val("");
                    goodDate = false;
                }
                //}
                //console.log("good Date: " + goodDate + " errorMessage; " + errorMsg)
                if (goodDate) {
                    $("#errorbirthday").html("").hide();
                };

                return goodDate;
            },
            customemail: function($el) {
                var emailVal = $.trim($el.val());
                if (emailVal == "") {
                    return false;
                }
                var emailReg = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                // Add user_id to api call (used on patient_profile page so that staff can edit)
                var addUserId = "";
                if (typeof(patientId) !== "undefined") {
                    addUserId = "&user_id="+patientId;
                } else if (hasValue($el.attr("data-user-id"))) {
                    addUserId = "&user_id="+ $el.attr("data-user-id")
                }
                // If this is a valid address, then use unique_email to check whether it's already in use
                if (emailReg.test(emailVal)) {
                    $.ajax ({
                        type: "GET",
                        //url: '/api/unique_email?email='+encodeURIComponent($el.val())+addUserId
                        url: '/api/unique_email?email='+encodeURIComponent(emailVal)+addUserId
                    }).done(function(data) {
                        if (data.unique) {
                            $("#erroremail").html('').parents(".form-group").removeClass('has-error');
                            if ($el.attr("data-update-on-validated") == "true" && $el.attr("data-user-id")) {
                                assembleContent.demo($el.attr("data-user-id"),true, $el);
                            };
                        } else {
                            $("#erroremail").html(i18next.t("This e-mail address is already in use. Please enter a different address.")).parents(".form-group").addClass('has-error');
                        }
                    }).fail(function() {
                        console.log(i18next.t("Problem retrieving data from server."));
                    });
                }
                return emailReg.test(emailVal);
            },
            htmltags: function($el) {
                var invalid = containHtmlTags($el.val());
                if (invalid) $("#error" + $el.attr("id")).html("Invalid characters in text.");
                else $("#error" + $el.attr("id")).html("");
                return !invalid;
            }
        },
        errors: {
            htmltags: i18next.t("Please remove invalid characters and try again."),
            birthday: i18next.t("Sorry, this isn't a valid date. Please try again."),
            customemail: i18next.t("This isn't a valid e-mail address, please double-check.")
        },
        disable: false
    }).off('input.bs.validator change.bs.validator'); // Only check on blur (turn off input)   to turn off change - change.bs.validator

});

var tnthDates = {
    /** validateDateInputFields  check whether the date is a sensible date in month, day and year fields.
     ** params: month, day and year values and error field ID
     ** NOTE this can replace the custom validation check; hook this up to the onchange/blur event of birthday field
     ** work better in conjunction with HTML5 native validation check on the field e.g. required, pattern match  ***/
    "validateDateInputFields": function(m, d, y, errorFieldId) {
        if (hasValue(m) && hasValue(d) && hasValue(y)) {

            var m = parseInt(m);
            var d = parseInt(d);
            var y = parseInt(y);
            var errorField = $("#" + errorFieldId);

            if (!(isNaN(m)) && !(isNaN(d)) && !(isNaN(y))) {
                var today = new Date();
                // Check to see if this is a real date
                var date = new Date(y,m-1,d);
                if (!(date.getFullYear() == y && (date.getMonth() + 1) == m && date.getDate() == d)) {
                    errorField.html(i18next.t("Invalid date. Please try again.")).show();
                    return false;
                }
                else if (date.setHours(0,0,0,0) >= today.setHours(0,0,0,0)) {
                    errorField.html(i18next.t("Date must not be in the future. Please try again.")).show();
                    return false; //shouldn't be in the future
                }
                else if (y < 1900) {
                    errorField.html(i18next.t("Date must not be before 1900. Please try again.")).show();
                    return false;
                };

                errorField.html("").hide();

                return true;

            } else return false;

        } else {
            return false;
        };
    },
    /***
     * changeFormat - changes date format, particularly for submitting to server
     * @param currentDate - date to change
     * @param reverse - use to switch from yyyy-mm-dd to dd/mm/yyyy
     * @param shorten - removes padding from zeroes (only in reverse)
     * @returns - a date as a string
     *
     * Examples:
     * changeFormat("29/04/2016") returns "2016-04-29T07:00:00", converts according to getTimezoneOffset
     * changeFormat("2016-04-29",true) returns "29/04/2016"
     * changeFormat("2016-04-29",true,true) returns "29/04/2016"
     ***/
    "changeFormat": function(currentDate,reverse,shorten) {
        if (currentDate == null || currentDate == "") {
            return null;
        }
        var yearToPass, convertDate, dateFormatArray;
        if (reverse) {
            dateFormatArray = currentDate.split("-");
            if (!dateFormatArray || (dateFormatArray.length == 0)) return null;
            yearToPass = dateFormatArray[0];
            if (shorten) {
                dateFormatArray[1] = dateFormatArray[1].replace(/^0+/, '');
                dateFormatArray[2] = dateFormatArray[2].replace(/^0+/, '');
            }
            convertDate = dateFormatArray[2]+"/"+dateFormatArray[1]+"/"+yearToPass;
        } else {
            dateFormatArray = currentDate.split("/");
            if (!dateFormatArray || (dateFormatArray.length == 0)) return null;
            // If patient manuals enters two digit year, then add 19 or 20 to year.
            // TODO - this is susceptible to Y2K for 2100s. Be better to force
            // user to type 4 digits.
            var currentTime = new Date();
            if (dateFormatArray[2].length == 2) {
                var shortYear = currentTime.getFullYear().toString().substr(2,2);
                if (dateFormatArray[2] > shortYear) {
                    yearToPass = '19'+dateFormatArray[2];
                } else {
                    yearToPass = '20'+dateFormatArray[2];
                }
            } else {
                yearToPass = dateFormatArray[2];
            }
            convertDate = yearToPass+"-"+dateFormatArray[1]+"-"+dateFormatArray[0]
            // add T according to timezone
            var tzOffset = currentTime.getTimezoneOffset();//minutes
            tzOffset /= 60;//hours
            if (tzOffset < 10) tzOffset = "0" + tzOffset;
            convertDate += "T" + tzOffset + ":00:00";
        }
        return convertDate
    },
    /**
     * Simply swaps:
     *      a/b/cdef to b/a/cdef
     *      (single & double digit permutations accepted...)
     *      ab/cd/efgh to cd/ab/efgh
     * Does not check for valid dates on input or output!
     * @param currentDate string eg 7/4/1976
     * @returns string eg 4/7/1976
     */
    "swap_mm_dd": function(currentDate) {
        var splitDate = currentDate.split('/');
        return splitDate[1] + '/' + splitDate[0] + '/' + splitDate[2];
    },
     /**
     * Convert month string to numeric
     *
     */

     "convertMonthNumeric": function(month) {
        if (!hasValue(month)) return "";
        else {
             month_map = {
                "jan":1,
                "feb":2,
                "mar":3,
                "apr":4,
                "may":5,
                "jun":6,
                "jul":7,
                "aug":8,
                "sep":9,
                "oct":10,
                "nov":11,
                "dec":12,
            };
            var m = month_map[month.toLowerCase()];
            return hasValue(m) ? m : "";
        };
     },
    /**
     * Convert month string to text
     *
     */
     "convertMonthString": function(month) {
        if (!hasValue(month)) return "";
        else {
            numeric_month_map = {
                1:"Jan",
                2:"Feb",
                3:"Mar",
                4:"Apr",
                5:"May",
                6:"Jun",
                7:"Jul",
                8:"Aug",
                9:"Sep",
                10:"Oct",
                11:"Nov",
                12:"Dec"
            };
            var m = numeric_month_map[parseInt(month)];
            return hasValue(m)? m : "";
        };
     },
     "isDate": function(obj) {
        return  Object.prototype.toString.call(obj) === '[object Date]' && !isNaN(obj.getTime());
     },
     "displayDateString": function(m, d, y) {
        var s = "";
        if (hasValue(d)) s = parseInt(d);
        if (hasValue(m)) s += (hasValue(s) ? " ": "") + this.convertMonthString(m);
        if (hasValue(y)) s += (hasValue(s) ? " ": "") + y;
        return s;
     },
    /***
     * parseDate - Fancier function for changing javascript date yyyy-mm-dd (with optional time) to a dd/mm/yyyy (optional time) format. Used with mPOWEr
     * @param date - the date to be converted
     * @param noReplace - prevent replacing any spaces with "T" to get in proper javascript format. 2016-02-24 15:28:09-0800 becomes 2016-02-24T15:28:09-0800
     * @param padZero - if true, will add padded zero to month and date
     * @param keepTime - if true, will output the time as part of the date
     * @param blankText - pass a value to display if date is null
     * @returns date as a string with optional time
     *
     * parseDate("2016-02-24T15:28:09-0800",true,false,true) returns "24/2/2016 3:28pm"
     */
    "parseDate": function(date,noReplace,padZero,keepTime,blankText) {
        if(date == null) {
            if (blankText) {
                return blankText;
            } else {
                return "";
            }
        }
        // Put date in proper javascript format
        if (noReplace == null) {
            date = date.replace(" ", "T");
        }
        // Need to reformat dates b/c of date format issues in Safari (and others?)
        // http://stackoverflow.com/questions/6427204/date-parsing-in-javascript-is-different-between-safari-and-chrome
        var a = date.split(/[^0-9]/);
        var toConvert;
        if (a[3]) {
            toConvert=new Date (a[0],a[1]-1,a[2],a[3],a[4],a[5]);
        } else {
            toConvert=new Date (a[0],a[1]-1,a[2]);
        }

        // Switch date to mm/dd/yyyy
        //var toConvert = new Date(Date.parse(date));
        var month = toConvert.getMonth() + 1;
        var day = toConvert.getDate();
        if (padZero) {
            if (month <= 9)
                month = '0' + month;
            if (day <= 9)
                day = '0' + day;
        }
        if (keepTime) {
            var amPm = "am";
            var hour = a[3];
            if (a[3] > 11) {
                amPm = "pm";
                if (a[3] > 12) {
                    hour = (a[3]-12);
                }
            }
            return day + "/" + month + "/" + toConvert.getFullYear()+" "+hour+":"+a[4]+amPm;
        } else {
            return day + "/" + month + "/" + toConvert.getFullYear();
        }
    },
    /***
     * parseForSorting - changes date to a YYYYMMDDHHMMSS string for sorting (note that this is a string rather than a number)
     * @param date - the date to be converted
     * @param noReplace - prevent replacing any spaces with "T" to get in proper javascript format. 2016-02-24 15:28:09-0800 becomes 2016-02-24T15:28:09-0800. Adding T indicates UTC time
     * @returns date as a string used by system for sorting
     *
     * parseDate("2016-02-24T15:28:09-0800",true) returns "201600224152809"
     */
    "parseForSorting": function(date,noReplace) {
        if (date == null) {
            return ""
        }
        // Put date in proper javascript format
        if (noReplace == null) {
            date = date.replace(" ", "T");
        }
        // Need to reformat dates b/c of date format issues in Safari (and others?)
        // http://stackoverflow.com/questions/6427204/date-parsing-in-javascript-is-different-between-safari-and-chrome
        var a = date.split(/[^0-9]/);
        var toConvert=new Date (a[0],a[1]-1,a[2],a[3],a[4],a[5]);
        // Switch date to mm/dd/yyyy
        //var toConvert = new Date(Date.parse(date));
        var month = toConvert.getMonth() + 1;
        var day = toConvert.getDate();
        if (month <= 9)
            month = '0' + month;
        if (day <= 9)
            day = '0' + day;
        return toConvert.getFullYear() + month + day + a[3] + a[4] + a[5]

    },
    /***
     * spellDate - spells out date in a format based on language/local. Currently not in use.
     * @param passDate - date to use. If empty, defaults to today.
     * @param ymdFormat - false by default. false = dd/mm/yyyy. true = yyyy-mm-dd
     * @returns spelled out date, localized
     */
    "spellDate": function(passDate,ymdFormat) {
        var todayDate = new Date();
        if (passDate) {
            // ymdFormat is true, we are assuming it's being received as YYYY-MM-DD
            if (ymdFormat) {
                todayDate = passDate.split("-");
                todayDate = new Date(todayDate[2], todayDate[0] - 1, todayDate[1])
            } else {
                // Otherwide dd/mm/yyyy
                todayDate = passDate.split("/");
                todayDate = new Date(todayDate[2], todayDate[1] - 1, todayDate[0])
            }
        }
        var returnDate;
        var monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        // If user's language is Spanish then use dd/mm/yyyy format and changes words
        if (userSetLang !== undefined && userSetLang == 'es_MX') {
            monthNames = ["enero","febrero","marzo","abril","mayo","junio","julio", "agosto","septiembre","octubre","noviembre","diciembre"];
            returnDate = ('0' + todayDate.getDate()).slice(-2)+" de "+monthNames[todayDate.getMonth()]+" de "+todayDate.getFullYear()
        } else if(userSetLang !== undefined && userSetLang == "en_AU") {
            returnDate = ('0' + todayDate.getDate()).slice(-2)+" "+monthNames[todayDate.getMonth()]+" "+todayDate.getFullYear()
        } else {
            returnDate = monthNames[todayDate.getMonth()]+" "+('0' + todayDate.getDate()).slice(-2)+", "+todayDate.getFullYear()
        }
        return returnDate
    },
    /***
     * Calculates number of days between two dates. Used in mPOWEr for surgery/discharge
     * @param startDate - required. Assumes YYYY-MM-DD. This is typically the date of surgery or discharge
     * @param dateToCalc - optional. If empty, then assumes today's date
     * @returns number of days
     */
    "getDateDiff": function(startDate,dateToCalc) {
        var a = startDate.split(/[^0-9]/);
        var dateTime = new Date(a[0], a[1]-1, a[2]).getTime();
        var d;
        if (dateToCalc) {
            var c = dateToCalc.split(/[^0-9]/);
            d = new Date(c[0], c[1]-1, c[2]).getTime()
        } else {
            // If no baseDate, then use today to find the number of days between dateToCalc and today
            d = new Date().getTime()
        }
        // Round down to floor so we don't add an extra day if session is 12+ hours into the day
        return Math.floor((d - dateTime) / (1000 * 60 * 60 * 24))
    },
    "getAge": function (birthDate, otherDate) {
        birthDate = new Date(birthDate);
        // Use today's date to calc, unless otherwise specified
        var secondDate = new Date();
        if (otherDate) {
            secondDate = new Date(otherDate);
        }
        var years = (secondDate.getFullYear() - birthDate.getFullYear());

        if (secondDate.getMonth() < birthDate.getMonth() ||
            secondDate.getMonth() == birthDate.getMonth() && secondDate.getDate() < birthDate.getDate()) {
            years--;
        }
        return years;
    },
    /***
     * Simple function to add "days" label to a number of days. Not localized, used for mPOWEr
     * @param dateVal - required. Often derived via getDateDiff
     * @returns {string}
     */
    "addDays": function(dateVal) {
        var toReturn = "N/A";
        if (dateVal && typeof dateVal != undefined) {
            if (dateVal == 1) {
                toReturn = "1 day";
            } else if (dateVal < 0) {
                toReturn = "--";
            } else {
                toReturn = dateVal + " days";
            }
        } else if (dateVal === 0) {
            toReturn = "Today";
        }
        return toReturn
    },
    "isValidDefaultDateFormat": function(date, errorField) {
        if (!hasValue(date)) return false;
        if (date.length < 10) return false;
        var dArray = $.trim(date).split(" ");
        if (dArray.length < 3) return false;
        var day = dArray[0], month = dArray[1], year = dArray[2];
        if (day.length < 1) return false;
        if (month.length < 3) return false;
        if (year.length < 4) return false;
        if (!/(0)?[1-9]|1\d|2\d|3[01]/.test(day)) return false;
        if (!/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(month)) return false;
        if (!/(19|20)\d{2}/.test(year)) return false;
        var dt = new Date(date);
        if (!this.isDateObj(dt)) return false;
        else if (!this.isValidDate(year, this.convertMonthNumeric(month), day)) {
            return false;
        } else {
          var today = new Date(), errorMsg = "";
          if (dt.getFullYear() < 1900) errorMsg = "Year must be after 1900";
          // Only allow if date is before today
          if (dt.setHours(0,0,0,0) > today.setHours(0,0,0,0)) {
              errorMsg = "The date must not be in the future.";
          };
          if (hasValue(errorMsg)) {
            if (errorField) $(errorField).text(errorMsg);
            return false;
          } else {
            if (errorField) $(errorField).text("");
            return true;
          }
        };
    },
    "isDateObj": function(d) {
        return Object.prototype.toString.call(d) === "[object Date]" && !isNaN( d.getTime());
    },
    "isValidDate": function(y, m, d) {
        var date = this.getDateObj(y, m, d);
        var convertedDate = this.getConvertedDate(date);
        var givenDate = this.getGivenDate(y, m, d);
        return ( givenDate == convertedDate);
    },
    /*
     * method does not check for valid numbers, will return NaN if conversion failed
     */
    "getDateObj": function(y, m, d, h, mi, s) {
        if (!h) h = 0;
        if (!mi) mi = 0;
        if (!s) s = 0;
        return new Date(parseInt(y),parseInt(m)-1,parseInt(d), parseInt(h), parseInt(mi), parseInt(s));
    },
    "getConvertedDate": function(dateObj) {
        if (dateObj && this.isDateObj(dateObj)) return ""+dateObj.getFullYear() + (dateObj.getMonth()+1) + dateObj.getDate();
        else return "";
    },
    "getGivenDate":function(y, m, d) {
        return ""+y+m+d;
    },
    /*
     * NB
     * For dateString in ISO-8601 format date as returned from server
     * e.g. '2011-06-29T16:52:48'*/

    "formatDateString": function(dateString, format) {
        if (dateString) {
               var iosDateTest = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
               var d = new Date(dateString);
               var ap, day, month, year, hours, minutes, seconds, nd;
               if (!this.isDateObj(d)) return "";
               if (iosDateTest.test(dateString)) {
                   //IOS date, no need to convert again to date object, just parse it as is
                   //issue when passing it into Date object, the output date is inconsistent across from browsers
                   var dArray = $.trim($.trim(dateString).replace(/[\.TZ:\-]/gi, " ")).split(" ");
                   year = dArray[0];
                   month = dArray[1];
                   day = dArray[2];
                   hours = dArray[3];
                   minutes = dArray[4];
                   seconds = dArray[5];
                }
                else {
                   day = d.getDate();
                   month = d.getMonth() + 1;
                   year = d.getFullYear();
                   hours = d.getHours();
                   minutes = d.getMinutes();
                   seconds = d.getSeconds();
                   nd = "";
                };

               day = pad(day);
               month = pad(month);
               hours = pad(hours);
               minutes = pad(minutes);
               seconds = pad(seconds);

               switch(format) {
                    case "mm/dd/yyyy":
                        nd = month + "/" + day + "/" + year;
                        break;
                    case "mm-dd-yyyy":
                        nd = month + "-" + day + "-" + year;
                        break;
                    case "mm-dd-yyyy hh:mm:ss":
                        nd = month + "-" + day + "-" + year + " " + hours + ":" + minutes + ":" + seconds;
                        break;
                    case "dd/mm/yyyy":
                        nd = day + "/" + month + "/" + year;
                        break;
                    case "dd/mm/yyyy hh:mm:ss":
                        nd = day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
                        break;
                    case "dd-mm-yyyy":
                        nd = day + "-" + month + "-" + year;
                        break;
                    case "dd-mm-yyyy hh:mm:ss":
                        nd = day + "-" + month + "-" + year + " " + hours + ":" + minutes + ":" + seconds;
                        break;
                    case "iso-short":
                    case "yyyy-mm-dd":
                        nd = year + "-" + month + "-" + day;
                        break;
                    case "iso":
                    case "yyyy-mm-dd hh:mm:ss":
                        nd = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
                        break;
                    case "d M y hh:mm:ss":
                        nd = this.displayDateString(month, day, year);
                        nd = nd + " " + hours + ":" + minutes + ":" + seconds;
                        break;
                    case "d M y":
                    default:
                        //console.log("dateString: " + dateString + " month: " + month + " day: " + day + " year: " + year)
                        nd = this.displayDateString(month, day, year);
                        break;
               };

           return nd;
        } else return "";
    },
    "convertToLocalTime": function (dateString) {
        var convertedDate = "";
        //assuming dateString is UTC date/time
        if (hasValue(dateString)) {
            var d = new Date(dateString);
            var newDate = new Date(d.getTime()+d.getTimezoneOffset()*60*1000);
            var offset = d.getTimezoneOffset() / 60;
            var hours = d.getHours();
            newDate.setHours(hours - offset);
            var options = {
                year: 'numeric', day: 'numeric', month: 'short',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            };
            convertedDate = newDate.toLocaleString(options);
        };
        return convertedDate;
    },
    "convertUserDateTimeByLocaleTimeZone": function (dateString, timeZone, locale) {
        //firefox does not support Intl API
        //if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) return dateString;

        if (!dateString) return "";
        else {
            var errorMessage = "";
            if (!hasValue(timeZone)) timeZone = "UTC";
            if (!hasValue(locale))  locale = "en-us";
            $(".timezone-error").html("");
            $(".timezone-warning").html("");
            //locale needs to be in this format - us-en
            //month: 'numeric', day: 'numeric',
            locale = locale.replace("_", "-").toLowerCase();
            var options = {
                year: 'numeric', day: 'numeric', month: 'short',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            };
            options.timeZone =  timeZone;
            //older browsers don't support this
            var convertedDate = dateString;
            try {
                if(/chrom(e|ium)/.test(navigator.userAgent.toLowerCase())){ //works in chrome
                    convertedDate = new Date(dateString).toLocaleString(locale, options);
                    if (timeZone != "UTC") $(".gmt").each(function() { $(this).hide()});
                } else {
                    if (timeZone != "UTC") {
                        convertedDate = convertToLocalTime(dateString);
                        $(".timezone-warning").addClass("text-warning").html(i18next.t("Date/time zone conversion is not supported in current browser. All date/time fields are converted to local time zone instead."));
                        $(".gmt").each(function() { $(this).hide()});
                    };
                }
            } catch(e) {
                errorMessage = i18next.t("Error occurred when converting timezone: ") + e.message;
            };
            if (hasValue(errorMessage)) {
                $(".timezone-error").each(function() {
                    $(this).addClass("text-danger").html(errorMessage);
                });
            };
            return convertedDate.replace(/\,/g, "");
        };
    },
    "getUserTimeZone": function (userId) {
        var selectVal = $("#profileTimeZone").length > 0 ? $("#profileTimeZone option:selected").val() : "";
        var userTimeZone = "";
        if (selectVal == "") {
            if (userId) {
                $.ajax ({
                    type: "GET",
                    url: '/api/demographics/'+userId,
                    async: false
                }).done(function(data) {
                    if (data) {
                        data.extension.forEach(
                            function(item, index) {
                                if (item.url === "http://hl7.org/fhir/StructureDefinition/user-timezone") {
                                    userTimeZone = item.timezone;
                                };
                            });
                    };

                }).fail(function() {
                    userTimeZone = "UTC";
                });
            };
        } else {
            userTimeZone = selectVal;
        };

        return hasValue(userTimeZone) ? userTimeZone : "UTC";
    },
    "getUserLocale": function (userId) {
      var localeSelect = $("#locale").length > 0 ? $("#locale option:selected").val() : "";
      var locale = "";

      if (!localeSelect) {
            if (userId) {
                $.ajax ({
                        type: "GET",
                        url: '/api/demographics/'+userId,
                        cache: false,
                        async: false
                }).done(function(data) {
                    if (data && data.communication) {
                        data.communication.forEach(
                            function(item, index) {
                                if (item.language) {
                                    locale = item["language"]["coding"][0].code;
                                    //console.log("locale: " + locale)
                                };
                        });
                    };

                }).fail(function() {
                    locale = "en-us";
                });
            };
       } else locale = localeSelect;

       //console.log("locale? " + locale)
       return locale ? locale : "en-us";
    }
};
/***
 * Bootstrap datatables functions
 * Uses http://bootstrap-table.wenzhixin.net.cn/documentation/
 ****/

var tnthTables = {
    /***
     * Quick way to sort when text is wrapper in an <a href> or other tag
     * @param a,b - the two items to compare
     * @returns 1,-1 or 0 for sorting
     */
    "stripLinksSorter": function(a,b) {
        a = $(a).text();
        b = $(b).text();
        var aa = parseFloat(a);
        var bb = parseFloat(b);
        //if (aa > bb) return 1;
        //if (aa < bb) return -1;
        //return 0;
        return  bb - aa;
    },
    /***
     * Quick way to sort when text is wrapped in an <a href> or other tag
     * NOTE for text that is NOT number
     * @param a,b - the two items to compare
     * @returns 1,-1 or 0 for sorting
     */
    "stripLinksTextSorter": function(a,b) {
        var aa = $(a).text();
        var bb = $(b).text();
        if(aa < bb) return -1;
        if(aa > bb) return 1;
        return 0;
    },
    /***
     * sorting date string,
     * @param a,b - the two items to compare - note, this assumes that the parameters
     * are in valid date format e.g. 3 August 2017
     * @returns 1,-1 or 0 for sorting
     */
    "dateSorter": function(a,b) {
        if (!hasValue(a)) a = 0;
        if (!hasValue(b)) b = 0;
        /*
         * make sure the string passed in does not have line break element
         * if so it is a possible mult-line text, split it up and use
         * the first item in the resulting array
         */
        var regex = /<br\s*[\/]?>/gi;
        a = a.replace(regex, "\n");
        b = b.replace(regex, "\n");
        var ar = a.split("\n");
        if (ar.length > 0) a = ar[0];
        var br = b.split("\n");
        if (br.length > 0) b = br[0];
        /* note getTime return returns the numeric value
         * corresponding to the time for the specified date according to universal time
         * therefore, can be used for sorting
         */
        var a_d = (new Date(a)).getTime();
        var b_d = (new Date(b)).getTime();

        if (isNaN(a_d)) a_d = 0;
        if (isNaN(b_d)) b_d = 0;

        return  b_d - a_d;
    }
};
/**
 * Protect window.console method calls, e.g. console is not defined on IE
 * unless dev tools are open, and IE doesn't define console.debug
 */
(function() {
    var console = (window.console = window.console || {});
    var noop = function () {};
    var log = console.log || noop;
    var start = function(name) { return function(param) { log("Start " + name + ": " + param); } };
    var end = function(name) { return function(param) { log("End " + name + ": " + param); } };

    var methods = {
        // Internet Explorer (IE 10): http://msdn.microsoft.com/en-us/library/ie/hh772169(v=vs.85).aspx#methods
        // assert(test, message, optionalParams), clear(), count(countTitle), debug(message, optionalParams), dir(value, optionalParams), dirxml(value), error(message, optionalParams), group(groupTitle), groupCollapsed(groupTitle), groupEnd([groupTitle]), info(message, optionalParams), log(message, optionalParams), msIsIndependentlyComposed(oElementNode), profile(reportName), profileEnd(), time(timerName), timeEnd(timerName), trace(), warn(message, optionalParams)
        // "assert", "clear", "count", "debug", "dir", "dirxml", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "msIsIndependentlyComposed", "profile", "profileEnd", "time", "timeEnd", "trace", "warn"

        // Safari (2012. 07. 23.): https://developer.apple.com/library/safari/#documentation/AppleApplications/Conceptual/Safari_Developer_Guide/DebuggingYourWebsite/DebuggingYourWebsite.html#//apple_ref/doc/uid/TP40007874-CH8-SW20
        // assert(expression, message-object), count([title]), debug([message-object]), dir(object), dirxml(node), error(message-object), group(message-object), groupEnd(), info(message-object), log(message-object), profile([title]), profileEnd([title]), time(name), markTimeline("string"), trace(), warn(message-object)
        // "assert", "count", "debug", "dir", "dirxml", "error", "group", "groupEnd", "info", "log", "profile", "profileEnd", "time", "markTimeline", "trace", "warn"

        // Firefox (2013. 05. 20.): https://developer.mozilla.org/en-US/docs/Web/API/console
        // debug(obj1 [, obj2, ..., objN]), debug(msg [, subst1, ..., substN]), dir(object), error(obj1 [, obj2, ..., objN]), error(msg [, subst1, ..., substN]), group(), groupCollapsed(), groupEnd(), info(obj1 [, obj2, ..., objN]), info(msg [, subst1, ..., substN]), log(obj1 [, obj2, ..., objN]), log(msg [, subst1, ..., substN]), time(timerName), timeEnd(timerName), trace(), warn(obj1 [, obj2, ..., objN]), warn(msg [, subst1, ..., substN])
        // "debug", "dir", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "time", "timeEnd", "trace", "warn"

        // Chrome (2013. 01. 25.): https://developers.google.com/chrome-developer-tools/docs/console-api
        // assert(expression, object), clear(), count(label), debug(object [, object, ...]), dir(object), dirxml(object), error(object [, object, ...]), group(object[, object, ...]), groupCollapsed(object[, object, ...]), groupEnd(), info(object [, object, ...]), log(object [, object, ...]), profile([label]), profileEnd(), time(label), timeEnd(label), timeStamp([label]), trace(), warn(object [, object, ...])
        // "assert", "clear", "count", "debug", "dir", "dirxml", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "profile", "profileEnd", "time", "timeEnd", "timeStamp", "trace", "warn"
        // Chrome (2012. 10. 04.): https://developers.google.com/web-toolkit/speedtracer/logging-api
        // markTimeline(String)
        // "markTimeline"

        assert: noop, clear: noop, trace: noop, count: noop, timeStamp: noop, msIsIndependentlyComposed: noop,
        debug: log, info: log, log: log, warn: log, error: log,
        dir: log, dirxml: log, markTimeline: log,
        group: start('group'), groupCollapsed: start('groupCollapsed'), groupEnd: end('group'),
        profile: start('profile'), profileEnd: end('profile'),
        time: start('time'), timeEnd: end('time')
    };

    for (var method in methods) {
        if ( methods.hasOwnProperty(method) && !(method in console) ) { // define undefined methods as best-effort methods
            console[method] = methods[method];
        }
    }
})();
var FieldLoaderHelper = function () {
    this.delayDuration = 600;
    this.showLoader = function(targetField) {
        if(targetField && targetField.length > 0) {
           $("#" + targetField.attr("data-save-container-id") + "_load").css("opacity", 1);
        };
    };

    this.showUpdate = function(targetField) {
        targetField = targetField || $(targetField);
        var __timeout = this.delayDuration;
        if(targetField && targetField.length > 0) {
            setTimeout(function() { (function(targetField) {
                var errorField = $("#" + targetField.attr("data-save-container-id") + "_error");
                var successField = $("#"+ targetField.attr("data-save-container-id") + "_success");
                var loadingField = $("#" + targetField.attr("data-save-container-id") + "_load");
                errorField.text("").css("opacity", 0);
                successField.text("success");
                loadingField.animate({"opacity": 0}, __timeout, function() {
                    successField.animate({"opacity": 1}, __timeout, function() {
                        setTimeout(function() { successField.animate({"opacity": 0}, __timeout*2); }, __timeout*2);
                });
             });
            })(targetField); }, __timeout);
        };
    };

    this.showError = function(targetField) {
        targetField = targetField || $(targetField);
        var __timeout = this.delayDuration;
        if(targetField && targetField.length > 0) {
            setTimeout(function() { (function(targetField) {
                var errorField = $("#" + targetField.attr("data-save-container-id") + "_error");
                var successField = $("#"+ targetField.attr("data-save-container-id") + "_success");
                var loadingField = $("#" + targetField.attr("data-save-container-id") + "_load");
                errorField.text("Unable to update. System/Server Error.");
                successField.text("").css("opacity", 0);
                loadingField.animate({"opacity": 0}, __timeout, function() {
                    errorField.animate({"opacity": 1}, __timeout, function() {
                        setTimeout(function() { errorField.animate({"opacity": 0}, __timeout*2); }, __timeout*2);
                });
             });
            })(targetField); }, __timeout);
        };
    };

};
var flo = new FieldLoaderHelper();
var LR_INVOKE_KEYCODE = 187; // "=" s=ign
function LRKeyEvent() {
    if ($(".button--LR").length > 0) {
        $("html").on("keydown", function(e) {
            if (e.keyCode == LR_INVOKE_KEYCODE) {
               $(".button--LR").toggleClass("data-show");
            };
        });
    };
};
function appendLREditContainer(target, url, show) {
    if (!hasValue(url)) return false;
    if (!target) target = $(document);
    target.append('<div>' +
                '<button class="btn btn-default button--LR"><a href="' + url + '" target="_blank">Edit in Liferay</a></button>' +
                '</div>'
                );
    if (show) $(".button--LR").addClass("data-show");

};
function getSaveLoaderDiv(parentID, containerID) {
    var el = $("#" + containerID + "_load");
    if (el.length == 0) {
        var c = $("#" + parentID + " #" + containerID);
        if (c.length > 0) {
            var snippet = '<div class="load-container">' + '<i id="' + containerID + '_load" class="fa fa-spinner fa-spin load-icon fa-lg save-info" style="margin-left:4px; margin-top:5px" aria-hidden="true"></i><i id="' + containerID + '_success" class="fa fa-check success-icon save-info" style="color: green" aria-hidden="true">Updated</i><i id="' + containerID + '_error" class="fa fa-times error-icon save-info" style="color:red" aria-hidden="true">Unable to Update.System error.</i></div>';
            if (window.getComputedStyle) {
                displayStyle = window.getComputedStyle(c.get(0), null).getPropertyValue('display');
            } else {
                displayStyle = (c.get(0)).currentStyle.display;
            };
            if (displayStyle == "block") {
                c.append(snippet);
            } else {
                if (displayStyle == "none" || !hasValue(displayStyle)) {
                    if (c.get(0).nodeName.toUpperCase() == "DIV" || c.get(0).nodeName.toUpperCase() == "P") c.append(snippet);
                    else c.after(snippet);
                } else c.after(snippet);
            };
        };
    };
};
function __getLoaderHTML(message) {
    return '<div class="loading-message-indicator"><i class="fa fa-spinner fa-spin fa-2x"></i>' + (hasValue(message)?"&nbsp;"+message:"") + '</div>';
}
function _isTouchDevice(){
    return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
};
function __convertToNumericField(field) {
    if (field) {
        if (_isTouchDevice()) field.each(function() {$(this).prop("type", "tel");});
    };
};
function hasValue(val) {return val != null && val != "" && val != "undefined";};
function isString (obj) {return (Object.prototype.toString.call(obj) === '[object String]');};
function disableHeaderFooterLinks() {
    var links = $("#tnthNavWrapper a, #homeFooter a").not("a[href*='logout']").not("a.required-link").not("a.home-link");
    links.addClass("disabled");
    links.prop('onclick',null).off('click');
    links.on("click", function(e) {
        e.preventDefault();
        return false;
    });
};
function pad(n) {n = parseInt(n); return (n < 10) ? '0' + n : n;};
function escapeHtml(text) {
    'use strict';
    if (text == null || text.length == 0)return text;
    return text.replace(/[\"&'\/<>]/g, function (a) {
        return {
            '"': '&quot;', '&': '&amp;', "'": '&#39;',
            '/': '&#47;',  '<': '&lt;',  '>': '&gt;'
        }[a];
    });
};
function containHtmlTags(text) {
    if (!hasValue(text)) return false;
    return /[<>]/.test(text);
};
function __getExportFileName(prefix) {
    var d = new Date();
    return (prefix?prefix:"ExportList_")+("00" + d.getDate()).slice(-2)+("00" + (d.getMonth() + 1)).slice(-2)+d.getFullYear()+("00" + d.getHours()).slice(-2)+ ("00" + d.getMinutes()).slice(-2)+ ("00" + d.getSeconds()).slice(-2);
}
var __winHeight = $(window).height(), __winWidth = $(window).width();
$.fn.isOnScreen = function(){
    var viewport = {};
    viewport.top = $(window).scrollTop();
    viewport.bottom = viewport.top + __winHeight;
    var bounds = {};
    bounds.top = this.offset().top;
    bounds.bottom = bounds.top + this.outerHeight();
    return ((bounds.top <= viewport.bottom) && (bounds.bottom >= viewport.top));
};
$.fn.sortOptions = function() {
      var selectOptions = $(this).find("option");
      selectOptions.sort(function(a, b) {
            if (a.text > b.text) return 1;
            else if (a.text < b.text) return -1;
            else return 0; });
      return selectOptions;
};
//Promise polyfill - IE doesn't support Promise - so need this
!function(e){function n(){}function t(e,n){return function(){e.apply(n,arguments)}}function o(e){if("object"!=typeof this)throw new TypeError("Promises must be constructed via new");if("function"!=typeof e)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],s(e,this)}function i(e,n){for(;3===e._state;)e=e._value;return 0===e._state?void e._deferreds.push(n):(e._handled=!0,void o._immediateFn(function(){var t=1===e._state?n.onFulfilled:n.onRejected;if(null===t)return void(1===e._state?r:u)(n.promise,e._value);var o;try{o=t(e._value)}catch(i){return void u(n.promise,i)}r(n.promise,o)}))}function r(e,n){try{if(n===e)throw new TypeError("A promise cannot be resolved with itself.");if(n&&("object"==typeof n||"function"==typeof n)){var i=n.then;if(n instanceof o)return e._state=3,e._value=n,void f(e);if("function"==typeof i)return void s(t(i,n),e)}e._state=1,e._value=n,f(e)}catch(r){u(e,r)}}function u(e,n){e._state=2,e._value=n,f(e)}function f(e){2===e._state&&0===e._deferreds.length&&o._immediateFn(function(){e._handled||o._unhandledRejectionFn(e._value)});for(var n=0,t=e._deferreds.length;n<t;n++)i(e,e._deferreds[n]);e._deferreds=null}function c(e,n,t){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof n?n:null,this.promise=t}function s(e,n){var t=!1;try{e(function(e){t||(t=!0,r(n,e))},function(e){t||(t=!0,u(n,e))})}catch(o){if(t)return;t=!0,u(n,o)}}var a=setTimeout;o.prototype["catch"]=function(e){return this.then(null,e)},o.prototype.then=function(e,t){var o=new this.constructor(n);return i(this,new c(e,t,o)),o},o.all=function(e){var n=Array.prototype.slice.call(e);return new o(function(e,t){function o(r,u){try{if(u&&("object"==typeof u||"function"==typeof u)){var f=u.then;if("function"==typeof f)return void f.call(u,function(e){o(r,e)},t)}n[r]=u,0===--i&&e(n)}catch(c){t(c)}}if(0===n.length)return e([]);for(var i=n.length,r=0;r<n.length;r++)o(r,n[r])})},o.resolve=function(e){return e&&"object"==typeof e&&e.constructor===o?e:new o(function(n){n(e)})},o.reject=function(e){return new o(function(n,t){t(e)})},o.race=function(e){return new o(function(n,t){for(var o=0,i=e.length;o<i;o++)e[o].then(n,t)})},o._immediateFn="function"==typeof setImmediate&&function(e){setImmediate(e)}||function(e){a(e,0)},o._unhandledRejectionFn=function(e){"undefined"!=typeof console&&console&&console.warn("Possible Unhandled Promise Rejection:",e)},o._setImmediateFn=function(e){o._immediateFn=e},o._setUnhandledRejectionFn=function(e){o._unhandledRejectionFn=e},"undefined"!=typeof module&&module.exports?module.exports=o:e.Promise||(e.Promise=o)}(this);

/*!
 * Validator v0.9.0 for Bootstrap 3, by @1000hz
 * Copyright 2015 Cina Saffary
 * Licensed under http://opensource.org/licenses/MIT
 *
 * https://github.com/1000hz/bootstrap-validator
 */

+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=a.extend({},c.DEFAULTS,d.data(),"object"==typeof b&&b),f=d.data("bs.validator");(f||"destroy"!=b)&&(f||d.data("bs.validator",f=new c(this,e)),"string"==typeof b&&f[b]())})}var c=function(b,d){this.$element=a(b),this.options=d,d.errors=a.extend({},c.DEFAULTS.errors,d.errors);for(var e in d.custom)if(!d.errors[e])throw new Error("Missing default error message for custom validator: "+e);a.extend(c.VALIDATORS,d.custom),this.$element.attr("novalidate",!0),this.toggleSubmit(),this.$element.on("input.bs.validator change.bs.validator focusout.bs.validator",a.proxy(this.validateInput,this)),this.$element.on("submit.bs.validator",a.proxy(this.onSubmit,this)),this.$element.find("[data-match]").each(function(){var b=a(this),c=b.data("match");a(c).on("input.bs.validator",function(){b.val()&&b.trigger("input.bs.validator")})})};c.INPUT_SELECTOR=':input:not([type="submit"], button):enabled:visible',c.DEFAULTS={delay:500,html:!1,disable:!0,custom:{},errors:{match:"Does not match",minlength:"Not long enough"},feedback:{success:"glyphicon-ok",error:"glyphicon-remove"}},c.VALIDATORS={"native":function(a){var b=a[0];return b.checkValidity?b.checkValidity():!0},match:function(b){var c=b.data("match");return!b.val()||b.val()===a(c).val()},minlength:function(a){var b=a.data("minlength");return!a.val()||a.val().length>=b}},c.prototype.validateInput=function(b){var c=a(b.target),d=c.data("bs.validator.errors");if(c.is('[type="radio"]')&&(c=this.$element.find('input[name="'+c.attr("name")+'"]')),this.$element.trigger(b=a.Event("validate.bs.validator",{relatedTarget:c[0]})),!b.isDefaultPrevented()){var e=this;this.runValidators(c).done(function(f){c.data("bs.validator.errors",f),f.length?e.showErrors(c):e.clearErrors(c),d&&f.toString()===d.toString()||(b=f.length?a.Event("invalid.bs.validator",{relatedTarget:c[0],detail:f}):a.Event("valid.bs.validator",{relatedTarget:c[0],detail:d}),e.$element.trigger(b)),e.toggleSubmit(),e.$element.trigger(a.Event("validated.bs.validator",{relatedTarget:c[0]}))})}},c.prototype.runValidators=function(b){function d(a){return b.data(a+"-error")||b.data("error")||"native"==a&&b[0].validationMessage||g.errors[a]}var e=[],f=a.Deferred(),g=this.options;return b.data("bs.validator.deferred")&&b.data("bs.validator.deferred").reject(),b.data("bs.validator.deferred",f),a.each(c.VALIDATORS,a.proxy(function(a,c){if((b.data(a)||"native"==a)&&!c.call(this,b)){var f=d(a);!~e.indexOf(f)&&e.push(f)}},this)),!e.length&&b.val()&&b.data("remote")?this.defer(b,function(){var c={};c[b.attr("name")]=b.val(),a.get(b.data("remote"),c).fail(function(a,b,c){e.push(d("remote")||c)}).always(function(){f.resolve(e)})}):f.resolve(e),f.promise()},c.prototype.validate=function(){var a=this.options.delay;return this.options.delay=0,this.$element.find(c.INPUT_SELECTOR).trigger("input.bs.validator"),this.options.delay=a,this},c.prototype.showErrors=function(b){var c=this.options.html?"html":"text";this.defer(b,function(){var d=b.closest(".form-group"),e=d.find(".help-block.with-errors"),f=d.find(".form-control-feedback"),g=b.data("bs.validator.errors");g.length&&(g=a("<ul/>").addClass("list-unstyled").append(a.map(g,function(b){return a("<li/>")[c](b)})),void 0===e.data("bs.validator.originalContent")&&e.data("bs.validator.originalContent",e.html()),e.empty().append(g),d.addClass("has-error"),f.length&&f.removeClass(this.options.feedback.success)&&f.addClass(this.options.feedback.error)&&d.removeClass("has-success"))})},c.prototype.clearErrors=function(a){var b=a.closest(".form-group"),c=b.find(".help-block.with-errors"),d=b.find(".form-control-feedback");c.html(c.data("bs.validator.originalContent")),b.removeClass("has-error"),d.length&&d.removeClass(this.options.feedback.error)&&d.addClass(this.options.feedback.success)&&b.addClass("has-success")},c.prototype.hasErrors=function(){function b(){return!!(a(this).data("bs.validator.errors")||[]).length}return!!this.$element.find(c.INPUT_SELECTOR).filter(b).length},c.prototype.isIncomplete=function(){function b(){return"checkbox"===this.type?!this.checked:"radio"===this.type?!a('[name="'+this.name+'"]:checked').length:""===a.trim(this.value)}return!!this.$element.find(c.INPUT_SELECTOR).filter("[required]").filter(b).length},c.prototype.onSubmit=function(a){this.validate(),(this.isIncomplete()||this.hasErrors())&&a.preventDefault()},c.prototype.toggleSubmit=function(){if(this.options.disable){var b=a('button[type="submit"], input[type="submit"]').filter('[form="'+this.$element.attr("id")+'"]').add(this.$element.find('input[type="submit"], button[type="submit"]'));b.toggleClass("disabled",this.isIncomplete()||this.hasErrors())}},c.prototype.defer=function(b,c){return c=a.proxy(c,this),this.options.delay?(window.clearTimeout(b.data("bs.validator.timeout")),void b.data("bs.validator.timeout",window.setTimeout(c,this.options.delay))):c()},c.prototype.destroy=function(){return this.$element.removeAttr("novalidate").removeData("bs.validator").off(".bs.validator"),this.$element.find(c.INPUT_SELECTOR).off(".bs.validator").removeData(["bs.validator.errors","bs.validator.deferred"]).each(function(){var b=a(this),c=b.data("bs.validator.timeout");window.clearTimeout(c)&&b.removeData("bs.validator.timeout")}),this.$element.find(".help-block.with-errors").each(function(){var b=a(this),c=b.data("bs.validator.originalContent");b.removeData("bs.validator.originalContent").html(c)}),this.$element.find('input[type="submit"], button[type="submit"]').removeClass("disabled"),this.$element.find(".has-error").removeClass("has-error"),this};var d=a.fn.validator;a.fn.validator=b,a.fn.validator.Constructor=c,a.fn.validator.noConflict=function(){return a.fn.validator=d,this},a(window).on("load",function(){a('form[data-toggle="validator"]').each(function(){var c=a(this);b.call(c,c.data())})})}(jQuery);

/* ============================================================
 * Bootstrap: rowlink.js v3.1.3
 * http://jasny.github.io/bootstrap/javascript/#rowlink
 * ============================================================
 * Copyright 2012-2014 Arnold Daniels
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */

+function($){"use strict";var Rowlink=function(element,options){this.$element=$(element)
this.options=$.extend({},Rowlink.DEFAULTS,options)
this.$element.on('click.bs.rowlink','td:not(.rowlink-skip)',$.proxy(this.click,this))}
Rowlink.DEFAULTS={target:"a"}
Rowlink.prototype.click=function(e){var target=$(e.currentTarget).closest('tr').find(this.options.target)[0]
if($(e.target)[0]===target)return
e.preventDefault();if(target.click){target.click()}else if(document.createEvent){var evt=document.createEvent("MouseEvents");evt.initMouseEvent("click",true,true,window,0,0,0,0,0,false,false,false,false,0,null);target.dispatchEvent(evt);}}
var old=$.fn.rowlink
$.fn.rowlink=function(options){return this.each(function(){var $this=$(this)
var data=$this.data('bs.rowlink')
if(!data)$this.data('bs.rowlink',(data=new Rowlink(this,options)))})}
$.fn.rowlink.Constructor=Rowlink
$.fn.rowlink.noConflict=function(){$.fn.rowlink=old
return this}
$(document).on('click.bs.rowlink.data-api','[data-link="row"]',function(e){if($(e.target).closest('.rowlink-skip').length!==0)return
var $this=$(this)
if($this.data('bs.rowlink'))return
$this.rowlink($this.data())
$(e.target).trigger('click.bs.rowlink')})}(window.jQuery);

