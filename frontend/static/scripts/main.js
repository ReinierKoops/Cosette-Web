/*
 main.js - cosette web index
*/

var join_elim = "/* define schema s1, \n   here s1 can contain any number of attributes, \n   but it has to at least contain integer attributes \n   x and y */\nschema s1(x:int, ya:int, ??);\n\nschema s2(yb:int, ??);        -- define schema s2\n\ntable a(s1);            -- define table a using schema s1\ntable b(s2);            -- define table b using schema s1\n\nquery q1                -- define query q1 on tables a and b\n`select distinct x.x as ax from a x, b y\n where x.ya = y.yb`;\n\nquery q2                -- define query q2 likewise\n`select distinct x.x as ax from a x, a y, b z \n where x.x = y.x and x.ya = z.yb`;\n\nverify q1 q2;           -- does q1 equal to q2?";
var conjunct_select = "/* schema s, here ?? means s can contain \n   any number of attributes */\nschema s(??);       \n\n/* table r has schema s */\ntable r(s); \n\n/* symbolic predicate b1 on s. \n   This means that b1 is a predicate that takes \n   in a tuple with schema s */\npredicate b1(s);\n\n/* symbolic predicate b2 on s */\npredicate b2(s);    \n\n/* query q1 */\nquery q1\n`select * from r x where b1(x) and b2(x)`;\n\n/* query q2 */\nquery q2\n`select * from (select * from r x where b1(x)) y \n where b2(y)`;\n\n/* does q1 equal to q2? */\nverify q1 q2;";
var common_exp = "/* define schema s1,\n   here s1 can contain any number of attributes, \n   but it has to at least contain integer attributes \n   x and y */\nschema s1(x:int, y:int, ??);\n\ntable a(s1);                   -- table a of schema s1\n\nquery q1                       -- query 1\n`select (x.x + x.x) as ax\n from a x where x.x = x.y`;\n\nquery q2                       -- query 2\n`select (x.x + x.y) as ax\n from a x where x.x = x.y`;\n\nverify q1 q2;                  -- verify the equivalence";
var disjunct_select_wrong = "/* define schema s1, \n   here s1 can contain any number of attributes */\nschema s(??);\n\n/* define table r using schema s1 */\ntable r(s);\n\n/* symbolic predicate b1 on s. \n   This means that b1 is a predicate that takes \n   in a tuple with schema s */\npredicate b1(s);\npredicate b2(s);    -- symbolic predicate b2 on s\n\nquery q1\n`select * from r x where b1(x) or b2(x)`;\n\nquery q2\n`select *\n from ((select * from r x where b1(x)) \n       union all (select * from r y where b2(y))) x`;\n \nverify q1 q2;";
var disjunct_select_right = "/* define schema s1, \n   here s1 can contain any number of attributes */\nschema s(??);\n\n/* define table r using schema s1 */\ntable r(s);\n\n/* symbolic predicate b1 on s. \n   This means that b1 is a predicate that takes \n   in a tuple with schema s */\npredicate b1(s);\npredicate b2(s);    -- symbolic predicate b2 on s\n\nquery q1\n`select distinct * from r x where b1(x) or b2(x)`;\n\nquery q2\n`select distinct *\n from ((select * from r x where b1(x)) \n       union all (select * from r y where b2(y))) x`;\n \nverify q1 q2;";
var cse344exam1 = "schema user_schema(uid:int, uname:int, city:int);\nschema pic_schema(uid:int, size:int);\n\ntable user(user_schema);\ntable picture(pic_schema);\n\nquery q1 \n`select x.uid as uid, x.uname as uname, \n        (select count(*) as cnt from picture y\n         where x.uid = y.uid and y.size > 1000000) as cnt\n from user x\n where x.city = 3`;\n\nquery q2\n `select x.uid as uid, x.uname as uname, count(*) as cnt\n  from user x, picture y\n  where x.uid = y.uid and y.size > 1000000 and x.city = 3\n  group by x.uid, x.uname`;\n\nverify q1 q2;";
var countbug = "schema s(pnum:int, shipdate:int);\nschema p(pnum:int, qoh:int);\n\ntable parts(p);\ntable supply(s);\n\nquery q1\n`select x.pnum as xp\n from parts x\n where x.qoh = (select count(y.shipdate) as cnt\n                 from supply y\n          where y.pnum = x.pnum AND y.shipdate < 10)`;\n\nquery q2\n`select x.pnum as xp\n from parts x, (select y.pnum as suppnum, count(y.shipdate) as ct\n                from supply y where y.shipdate < 10\n                group by y.pnum) temp\n where x.qoh = temp.ct AND x.pnum = temp.suppnum`;\n\nverify q1 q2;";

// editor setting
$("#editor").text(join_elim);
var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.getSession().setMode("ace/mode/sql");
editor.setOptions({
    fontSize: "11pt"
});
editor.getSession().setUseWrapMode(true);

var the_number = 42;

// process each cell of the content of a table
function process_cell(cell){
    if(typeof cell === "string" || cell instanceof String){
        if(cell.startsWith("sv")){
            return the_number;
        }
    }
    return cell;
}

// generate a row of a table: row is an array
function gen_row_html(row){
    var makecell = (x) => '<td>' + process_cell(x) + '</td>';
    var concat = (x, y) => x + y;
    return row.map(makecell).reduce(concat, '') + '</tr>';
}

// processing header names
function process_header_name(hn){
    if(hn === "unknowns"){
        return "??";
    } else {
        return hn;
    }
}

// it takes a json object: counterexamples
function gen_counterexamples_html(counterexamples){
    var html = "";
    html += "Two queries are not equivalent."
    html += '<br><br><p><span style="font-weight: bold;">Counter Examples: </span>';
    html += '(i.e., input tables that, when fed into your input queries, will return different results)</p>';
    for (var i = 0; i < counterexamples.length; i++) {
        var table = counterexamples[i];
        var table_html = '<p>';
        table_html += 'Table <em> ' + table["table-name"] + '</em> <br>';
        table_html += '<table><tr>';

        // generate headers
        var header = table['table-content'][0];
        for (var j = 0; j < header.length; j++) {
            table_html += '<th>' + process_header_name(header[j]) + '</th>';
        }
        table_html += '</tr><tr>';

        // we don't generate multiplicity column here, instead generate concrete rows
        var content = table['table-content'][1];
        for (var j = 0; j < content.length; j++) {
            var row = content[j][0];
            var multiplicity = content[j][1];
            for(var k =0; k < multiplicity; k++){
                table_html += gen_row_html(row);
            }
        }

        table_html += '</table> </p>';
        html += table_html;
        html += '<p> ?? is a synthetic attribute that represents any number of attributes. </p>';
    }
    return html;
}

$(function () {

    if (!Cookies.get('token')) {
        $('#regModal').modal({backdrop: 'static', keyboard: false});
    }

    $('.register-btn').click(function() {
        var name = $('#name-input').val();
        var email = $('#email-input').val();
        var pass = $('#pass-input').val();
        var inst = $('#institution-input').val();

        if (!name || !email || !pass || !inst) {
            alert("Please fill in all the forms");
            return false;
        }

        $.ajax({
            url: '/register',
            method: 'POST',
            data: {
                "name": name,
                "email": email,
                "password": pass,
                "institution": inst
            },
            success: function (data) {
                var res = $.parseJSON(data)
                var stat = res['status'];
                if (stat == 'error') {
                    console.log('email taken');
                    $('.email-taken').show();
                } else if (stat == 'success') {
                    Cookies.set('token', res['token']);
                    $('#regModal').modal('hide');
                }
            }
        });
    });

    $('.show-key-anchor').click(function() {
        $('.api-key').text(Cookies.get('token'));
        $('#keyModal').modal();
    });

    var logging_in = false;

    $('.login-btn').click(function() {
        if (!logging_in) {
            logging_in = true;
            $('#name-input').hide();
            $('#institution-input').hide();
            $('.register-btn').hide();
            $('.or-text').hide();
            $('.login-btn').addClass('btn-primary');
            $('.login-btn').removeClass('btn-secondary');
        } else {
            var email = $('#email-input').val();
            var pass = $('#pass-input').val();

            if (!email || !pass) {
                alert("Please fill in all the forms");
                return false;
            }

            $.ajax({
                url: '/login',
                method: 'POST',
                data: {
                    'email': email,
                    'password': pass
                },
                success: function (data) {
                    var res = $.parseJSON(data);
                    var stat = res['status'];
                    if (stat == 'success') {
                        Cookies.set('token', res['token'])
                        $('#regModal').modal('hide');
                    } else {
                        $('.invalid-creds').show();
                    }
                }
            });
        }
    });

    $('.submit-btn').click(function () {
        var query = editor.getValue();
        $("#feedback").text("");
        $.ajax({
            url: '/solve',
            method: 'POST',
            data: { "query": query, "api_key": Cookies.get('token') },
            success: function (data) {
                var result = $.parseJSON(data);
                var html = "";
                var answer = result["result"]
                console.log(result);
                if (answer === "NEQ") {
                    var ros = result["counterexamples"];
                    $("#feedback").html(gen_counterexamples_html(ros));
                } else if (answer === "EQ") {
                    $("#feedback").text("Two queries are equivalent.");
                } else if (answer === "UNKNOWN") {
                    $("#feedback").text("Two queries' equivalence is unknown. Solver runs out of time.");
                } else { //error
                    $("#feedback").text(result["error_msg"]);
                }
            }
        });
    });

    var $solving = $('#solving').hide();
    $(document)
        .ajaxStart(function () { $solving.show(); })
        .ajaxStop(function () { $solving.hide(); });

    $('.sample1').click(function () {
        editor.setValue(join_elim, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

    $('.sample2').click(function () {
        editor.setValue(disjunct_select_wrong, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

    $('.sample3').click(function () {
        editor.setValue(disjunct_select_right, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

    $('.sample4').click(function () {
        editor.setValue(conjunct_select, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

    $('.sample5').click(function () {
        editor.setValue(common_exp, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

    $('.sample6').click(function () {
        editor.setValue(countbug, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

    $('.sample7').click(function () {
        editor.setValue(cse344exam1, -1);
        $("#feedback").text("");
        $("#dropdownMenuButton").text($(this).text());
    });

});
