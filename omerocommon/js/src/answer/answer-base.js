/**
 * Created by kikkomep on 12/2/15.
 */

define("qtype_omerocommon/answer-base",
    [
        'jquery',
        'qtype_omerocommon/moodle-forms-utils',
        'qtype_omerocommon/multilanguage-element',
        'qtype_omerocommon/multilanguage-attoeditor'
    ],
    function ($, Editor, FormUtils) {
        // Private functions.

        function notifyListeners(answer, event) {
            console.log("notifying event...", event);
            for (var i in answer._listeners) {
                var listener = answer._listeners[i];
                var callbackName = "on" + event.name.charAt(0).toUpperCase() + event.name.substr(1);
                if (listener && listener[callbackName])
                    listener[callbackName](event);
            }
        }

        // Public functions
        return {
            initialize: function (str) {
                console.log("Initialized", this);

                // defines the basic package
                M.qtypes = M.qtypes || {};

                // defines the specific package of this module
                M.qtypes.omerocommon = M.qtypes.omerocommon || {};


                /**
                 * Defines MoodleFormUtils class
                 * @type {{}}
                 */
                M.qtypes.omerocommon.AnswerBase = function (answer_list_container_id, answer_number, fraction_options) {

                    // the reference to this scope
                    var me = this;

                    me._inputs = {};

                    // map of editors in use
                    me._editors_map = {};

                    me._data = {};

                    me._fraction_options = fraction_options;

                    // reference to the container of all answers
                    me._answer_list_container = $("#" + answer_list_container_id + " .fcontainer");

                    // listeners
                    me._listeners = [];

                    //
                    me._form_utils = new M.qtypes.omerocommon.MoodleFormUtils();

                    // the id of this answerContainer
                    me._answer_number = answer_number === undefined
                        ? M.qtypes.omerocommon.MoodleFormUtils.generateGuid() : answer_number;
                };


                var prototype = M.qtypes.omerocommon.AnswerBase.prototype;

                prototype.getId = function () {
                    return this._answer_number;
                };


                prototype._answer_properties = ["answer", "fraction", "feedback"];

                /**
                 * Builds the answer
                 *
                 * @private
                 */
                prototype._build = function () {
                    // the reference to this scope
                    var me = this;
                    me._answer_container = $('<div class="fitem" id="' + me._answer_number + '"></div>');
                    me._answer_list_container.append(me._answer_container);

                    me._form_utils.appendElement(me._answer_container, "Grade", "<select ><option>1</option></select>");
                    me._form_utils.appendElement(me._answer_container, "Feedback", "<textarea>xxx</textarea>");
                };


                /**
                 * Shows the answer
                 */
                prototype.show = function () {
                    // the reference to this scope
                    var me = this;
                    if (!me._answer_container)
                        me._build();
                    else
                        me._answer_list_container.append(me._answer_container);
                };

                /**
                 * Hides the answer
                 */
                prototype.hide = function () {
                    // the reference to this scope
                    var me = this;
                    if (me._answer_container)
                        me._answer_container.remove();
                };

                prototype.addListener = function (listener) {
                    this._listeners.push(listener);
                };

                prototype.removeListener = function (listener) {
                    var index = this._listeners.indexOf(listener);
                    if (index !== -1)
                        this._listeners.splice(index, 1);
                };

                prototype._notifyListeners = function (event) {
                    notifyListeners(this, event);
                };

                prototype.getDataToSubmit = function () {
                    var data = {};
                    for (var n in this._data)
                        data[n] = this._data[n];
                    return data;
                };

                /**
                 * Returns the map <language, editor>
                 * related to this question
                 *
                 * @returns {{}}
                 */
                prototype.getEditorsMap = function () {
                    var result = {};
                    for (var i in this._editors_map)
                        result[this._answer_number + "_" + i] = this._editors_map[i];
                    return result;
                };


                /**
                 *
                 *
                 * @param index
                 */
                prototype.updateHeader = function (index) {
                    // reference to the head
                    this._answer_head.html(M.util.get_string("answer_choiceno", "qtype_omerocommon") + index);
                };


                /**
                 *
                 *
                 * @param answer_index
                 * @param remove_form_inputs
                 */
                prototype.loadDataFromFormInputs = function (answer_index, remove_form_inputs) {
                    console.log("Loading data from inputs...", this);
                    var me = this;
                    var data = {};
                    for (var i in me._answer_properties) {
                        var element_name = this._answer_properties[i];
                        var element = me.findFormInputElement(element_name, answer_index);
                        data[element_name] = element.val();
                        if (remove_form_inputs) element.remove();

                        element = me._inputs[element_name];
                        if (element) {
                            var value = parseFloat(data[element_name]);
                            value = ((value == 1 || value == 0) ? value.toFixed(1) : value);
                            document.getElementById($(element).attr("id")).value = value;
                        }
                    }

                    console.log("Loading multi language elements...");
                    for (var editor_element_name in me._editors_map) {
                        var editor = me._editors_map[editor_element_name];
                        var locale_map_name = me._build_locale_map_name_of(editor_element_name, answer_index);
                        var id = 'id_' + locale_map_name;
                        console.log("Loading editor data...", id, locale_map_name);
                        editor.loadDataFromFormInputs(locale_map_name);
                        editor.onLanguageChanged("en");
                    }

                    this._data = data;
                };

                prototype.saveDataToFormInputs = function (answer_index) {

                    var form = document.forms[0];
                    if (!form) {
                        console.warn("Form not found!!!");
                        return;
                    }

                    for (var i in this._answer_properties) {
                        var element_name = this._answer_properties[i];
                        var id = this._build_id_of(element_name, answer_index);
                        var name = this._build_name_of(element_name, answer_index);
                        var value = this._data[element_name];

                        var hidden = document.getElementById(id); //$("#" + id);
                        if (hidden) hidden.setAttribute("value", value);
                        else {
                            hidden = '<input ' + 'id="' + id + '" ' + 'name="' + name + '" type="hidden" value="' + value + '">';
                            M.qtypes.omerocommon.MoodleFormUtils.appendHiddenElement(this._answer_container, hidden);
                        }
                    }

                    console.log("Saving multi language elements...", this._answer_number);
                    for (var element_name in this._editors_map) {

                        var editor = this._editors_map[element_name];
                        var locale_map_name = this._build_locale_map_name_of(element_name, answer_index);
                        var id = 'id_' + locale_map_name;
                        console.log("Saving editor data...", id, locale_map_name);

                        var hidden = document.getElementById(id);
                        if (!hidden) //hidden.val(value);
                        {
                            hidden = '<input ' +
                                'id="' + id + '" ' + 'name="' + locale_map_name + '" type="hidden" >';
                            console.log("Creating the hidden field", id, name, locale_map_name);
                            M.qtypes.omerocommon.MoodleFormUtils.appendHiddenElement(this._answer_container, hidden);
                            console.log("Created the hidden field", id, name, locale_map_name);
                        } else {
                            console.log("Found hidden field to save editor data...", id, name, locale_map_name);
                        }

                        editor.saveDataToFormInputs(locale_map_name);
                    }
                };

                prototype.findFormInputElement = function (element_name, answer_index) {
                    return $("[name*=" + element_name + "\\[" + answer_index + "\\]]");
                };

                prototype._build_name_of = function (element_name, answer_index) {
                    answer_index = (typeof answer_index !== 'undefined') ? answer_index : this._answer_number;
                    return element_name + '[' + answer_index + "]";
                };

                prototype._build_locale_map_name_of = function (element_name, answer_index) {
                    //alert("Building locale map name: " + element_name + " -- " + answer_index);
                    answer_index = (typeof answer_index !== 'undefined') ? answer_index : this._answer_number;
                    //alert("Computed answer index: " + answer_index);
                    return element_name + '_locale_map[' + answer_index + "]";
                };

                prototype._build_id_of = function (element_name, answer_index) {
                    return 'id_' + this._build_name_of(element_name, answer_index);
                };

                prototype._build_textarea_of = function (element_name, label, local_map_name) {
                    var id = this._build_id_of(element_name);
                    var name = this._build_name_of(element_name);
                    var value = this._data[element_name];

                    local_map_name = (typeof local_map_name === 'undefined')
                        ? this._build_locale_map_name_of(element_name) : local_map_name;

                    var element = '<textarea ' +
                        'id="' + this._build_id_of(element_name) + '" ' +
                        'name="' + this._build_name_of(element_name) + '" ' +
                        'rows="2"' +
                        '></textarea>';

                    this._form_utils.appendElement(this._answer_container, label, element, local_map_name);
                    //this._init_textarea_editor(element_name);
                    var editor = new M.qtypes.omerocommon.MultilanguageAttoEditor(name, local_map_name, false);
                    editor.init("en"); //language_selector.val()
                    //editor.init("en", local_map_name);
                    this._editors_map[element_name] = editor;
                    console.log("Editors map", this._editors_map);
                };

                prototype._init_textarea_editor = function (element_name) {
                    var name = this._build_name_of(element_name);
                    var editor = new M.qtypes.omerocommon.MultilanguageAttoEditor(name, this._build_locale_map_name_of(element_name), false);
                    editor.init("en");
                    this._editors_map[name] = editor;
                };

                prototype._build_select_of = function (element_name, label) {
                    var id = this._build_id_of(element_name);
                    var name = this._build_name_of(element_name);
                    var value = this._data[element_name];

                    if (typeof value !== "undefined") value = parseFloat(value);

                    var select = '<select ' +
                        'id="' + id + '_select" ' + 'name="' + name + '_select">';

                    for (var i in this._fraction_options)
                        select += '<option value="' + i + '" ' +
                            (value == i ? 'selected="selected"' : "") + '>' +
                            this._fraction_options[i] + '</option>';
                    select += '</select>';
                    var fraction_selector = $(select);
                    this._form_utils.appendElement(this._answer_container, label, fraction_selector, false);

                    this._inputs[element_name] = select;

                    var me = this;
                    fraction_selector = document.getElementById(id + "_select");
                    fraction_selector.onchange = function (data) {
                        console.log("Changed grade", data);
                        me._data[element_name] = fraction_selector.options[fraction_selector.selectedIndex].value;
                    }
                };

                prototype._build_hidden_of = function (element_name, value) {
                    var id = this._build_id_of(element_name);
                    var name = this._build_name_of(element_name);

                    var old = $("[name*=" + element_name + "\\[" + this._answer_number + "\\]]");
                    if (old.length > 0) {
                        value = old.val();
                        old.remove();
                    } else {
                        var hidden = '<input ' +
                            'id="' + id + '" ' + 'name="' + name + '" type="hidden" >';
                        this._form_utils.appendElement(this._answer_container, "", hidden, false);
                    }
                };


            }
        };
    }
);