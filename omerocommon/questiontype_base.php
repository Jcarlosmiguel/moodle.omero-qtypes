<?php

// Copyright (c) 2015-2016, CRS4
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


/**
 * Question type class for the omerocommon question type.
 *
 * @package    qtype
 * @subpackage omerocommon
 * @copyright  2015-2016 CRS4
 * @license    https://opensource.org/licenses/mit-license.php MIT license
 */


defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/questionlib.php');
require_once($CFG->dirroot . '/question/engine/lib.php');
require_once($CFG->dirroot . '/question/type/multichoice/questiontype.php');


/**
 * The omeromultichoice question type.
 *
 */
abstract class qtype_omerocommon extends qtype_multichoice
{

    /**
     * Returns the name of the concrete class
     * which this class subsumes.
     *
     * @return string
     */
    protected function get_qtype()
    {
        return get_class($this);
    }


    /**
     * Returns the name of the table to store questions
     * represented by the subclasses of this base class.
     * Note that we reduce the table name due to the
     * limitation which imposes table names of 28 characters.
     *
     * @return mixed
     */
    protected function get_table_name()
    {
        return str_replace("omero", "ome", get_class($this)) . "_options";
    }

    /**
     * If your question type has a table that extends the question table, and
     * you want the base class to automatically save, backup and restore the extra fields,
     * override this method to return an array wherer the first element is the table name,
     * and the subsequent entries are the column names (apart from id and questionid).
     *
     * @return mixed array as above, or null to tell the base class to do nothing.
     */
    public function extra_question_fields()
    {
        return array($this->get_table_name(),
            "omeroimageurl", "visiblerois", "focusablerois", "omeroimagelocked", "omeroimageproperties"
        );
    }

    public function extra_answer_fields()
    {
        return array("question_answers_omemopt", "images");
    }


    protected function make_question_instance($questiondata)
    {
        question_bank::load_question_definition_classes($this->name());
        $class = get_class($this);
        if ($questiondata->options->single) {
            $class = $class . '_single_question';
        } else {
            $class = $class . '_multi_question';
        }
        return new $class();
    }


    public function get_question_options($question)
    {
        global $DB;
        $question->options = $DB->get_record($this->get_table_name(),
            array('questionid' => $question->id), '*', MUST_EXIST);
        return question_type::get_question_options($question);
    }

    public function save_question($question, $form)
    {
        global $DB;
        $question = parent::save_question($question, $form);
        if ($question) {
            $question->questiontext = qtype_omerocommon::serialize_to_multilang_form($form->questiontext_locale_map);
            $question->generalfeedback = qtype_omerocommon::serialize_to_multilang_form($form->generalfeedback_locale_map);
            $DB->update_record('question', $question);
        }
        return $question;
    }


    protected function initialise_question_instance(question_definition $question, $questiondata)
    {
        parent::initialise_question_instance($question, $questiondata);
    }

    protected function initialise_question_answers(question_definition $question,
                                                   $questiondata, $forceplaintextanswers = true)
    {
        parent::initialise_question_answers($question, $questiondata, $forceplaintextanswers);
        // set extra fields of answer options
        foreach ($question->answers as $ansid => $answer) {
            $answer->feedbackimages = array();
            $images = isset($questiondata->options->answers[$ansid]->images)
                ? json_decode(html_entity_decode($questiondata->options->answers[$ansid]->images)) : array();
            foreach ($images as $image) {
                $answer->feedbackimages[$image->id] = $image;
            }
        }
    }


    public function delete_question($questionid, $contextid)
    {
        global $DB;
        $DB->delete_records($this->get_table_name(), array('questionid' => $questionid));
        parent::delete_question($questionid, $contextid);
    }

    public function save_question_answers($question)
    {
        parent::save_question_answers($question); // TODO: Change the autogenerated stub
    }


    /**
     * Serialize a JSON array of a multilang text to HTML
     *
     * @param $json_format
     * @return string
     */
    public static function serialize_to_multilang_form($json_format)
    {
        $result = "";
        $languages = array();
        $json_data = json_decode($json_format);
        foreach ($json_data as $lang => $text) {
            if (!empty(strip_tags($text)) && !in_array($lang, $languages)) {
                $result .= '<div class="multilang" lang="' . $lang . '">' . $text . '</div>';
                array_push($languages, $lang);
            }
        }
        return qtype_omerocommon::normalize_html_text($result);
    }


    /**
     * Remove style attributes not generated by the Moodle editor
     *
     * @param $html
     * @return string
     */
    public static function normalize_html_text($html, $decode = true)
    {
        $ALLOWED_TAGS = "<p><b><i><a><br><img><div><span><strike><sub><sup><table><caption><tbody><tr><th><td>";
        $ELEMENTS_TO_SKIP = array("img", "a");

        // decode HTML entities
        if ($decode)
            $html = html_entity_decode($html);

        // preprocess text to skip not allowed tags
        $html = strip_tags($html, $ALLOWED_TAGS);

        // build an XML document to parse the HTML which has to be normalized
        $dom = new DOMDocument();
        $dom->strictErrorChecking = FALSE;
        $dom->loadHTML('<?xml version="1.0" encoding="UTF-8"?><html><body>' . $html . '</body></html>');

        // XPath processor related to the document
        $finder = new DomXPath($dom);

        // remove ID attribute
        foreach ($finder->query('//*[@id]') as $node) {
            $node->removeAttribute("id");
        }

        // search all nodes with the attribute
        foreach ($finder->query('//*[@style]') as $node) {
            $style = $node->getAttribute('style');
            preg_match("/(text-align:[^;]+)/", $style, $matches);
            if (count($matches) > 0) {
                $node->setAttribute("style", $matches[1]);
            } else if (!in_array($node->nodeName, $ELEMENTS_TO_SKIP)) {
                $node->removeAttribute("style");
            }
        }

        return self::DOMinnerHTML($dom->getElementsByTagName("body")->item(0));
    }


    /**
     * Returns the list of div[@multilang]
     * contained within the given <pre>$html</pre>
     *
     * @param $multilang_format
     * @return array array of pairs (language, string)
     */
    public static function serialize_to_json_from($multilang_format)
    {
        $result = array();
        $languages = array();
        $dom = new DOMDocument();
        $dom->strictErrorChecking = FALSE;
        $dom->loadHTML('<?xml version="1.0" encoding="UTF-8"?><html><body>' . $multilang_format . '</body></html>');
        $finder = new DomXPath($dom);
        $classname = "multilang";
        $nodes = $finder->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' $classname ')]");
        foreach ($nodes as $node) {
            $lang = $node->getAttribute("lang");
            $text = self::DOMinnerHTML($node);
            if (!empty(strip_tags($text)) && !in_array($lang, $languages)) {
                $result[$lang] = $text;
                array_push($languages, $lang);
            }
        }
        return $result;
    }

    /**
     * Returns the innerHTML of a given DOMNode
     *
     * @param DOMNode $element
     * @return string
     */
    private static function DOMinnerHTML(DOMNode $element)
    {
        $innerHTML = "";
        $children = $element->childNodes;
        foreach ($children as $child) {
            $innerHTML .= $element->ownerDocument->saveHTML($child);
        }
        return $innerHTML;
    }
}
