const MODE_NORMAL = 1, MODE_ENDLESS = 2, MODE_PRACTICE = 3;

(function(w) {
    let isDesktop = !navigator['userAgent'].match(/(ipad|iphone|ipod|android|windows phone)/i);
    let fontunit = isDesktop ? 20 : ((window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth) / 320) * 10;
    document.write('<style type="text/css">' +
        'html,body {font-size:' + (fontunit < 30 ? fontunit : '30') + 'px;}' +
        (isDesktop ? '#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position: absolute;}' :
            '#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position:fixed;}@media screen and (orientation:landscape) {#landscape {display: box; display: -webkit-box; display: -moz-box; display: -ms-flexbox;}}') +
        '</style>');
    let map = {'d': 1, 'f': 2, 'j': 3, 'k': 4};
    if (isDesktop) {
        document.write('<div id="gameBody">');
        document.onkeydown = function (e) {
            let key = e.key.toLowerCase();
            if (Object.keys(map).indexOf(key) !== -1) {
                click(map[key])
            }
        }
    }

    let body, blockSize, GameLayer = [],
        GameLayerBG, touchArea = [],
        GameTimeLayer;
    let transform, transitionDuration, welcomeLayerClosed;

    let mode = MODE_NORMAL;

    w.init = function() {
        showWelcomeLayer();
        body = document.getElementById('gameBody') || document.body;
        body.style.height = window.innerHeight + 'px';
        transform = typeof (body.style.webkitTransform) != 'undefined' ? 'webkitTransform' : (typeof (body.style.msTransform) !=
        'undefined' ? 'msTransform' : 'transform');
        transitionDuration = transform.replace(/ransform/g, 'ransitionDuration');
        GameTimeLayer = document.getElementById('GameTimeLayer');
        GameLayer.push(document.getElementById('GameLayer1'));
        GameLayer[0].children = GameLayer[0].querySelectorAll('div');
        GameLayer.push(document.getElementById('GameLayer2'));
        GameLayer[1].children = GameLayer[1].querySelectorAll('div');
        GameLayerBG = document.getElementById('GameLayerBG');
        if (GameLayerBG.ontouchstart === null) {
            GameLayerBG.ontouchstart = gameTapEvent;
        } else {
            GameLayerBG.onmousedown = gameTapEvent;
        }
        gameInit();
        initSetting();
        window.addEventListener('resize', refreshSize, false);
    }

    function modeToString(m) {
        return m === MODE_NORMAL ? "普通模式" : (m === MODE_ENDLESS ? "无尽模式" : "练习模式");
    }

    w.changeMode = function(m) {
        mode = m;
        document.getElementById('mode').innerText = modeToString(m);
    }

    w.readyBtn = function() {
        closeWelcomeLayer();
        updatePanel();
    }

    w.winOpen = function() {
        window.open(location.href + '?r=' + Math.random(), 'nWin', 'height=500,width=320,toolbar=no,menubar=no,scrollbars=no');
        let opened = window.open('about:blank', '_self');
        opened.opener = null;
        opened.close();
    }

    let refreshSizeTime;

    function refreshSize() {
        clearTimeout(refreshSizeTime);
        refreshSizeTime = setTimeout(_refreshSize, 200);
    }

    function _refreshSize() {
        countBlockSize();
        for (let i = 0; i < GameLayer.length; i++) {
            let box = GameLayer[i];
            for (let j = 0; j < box.children.length; j++) {
                let r = box.children[j],
                    rstyle = r.style;
                rstyle.left = (j % 4) * blockSize + 'px';
                rstyle.bottom = Math.floor(j / 4) * blockSize + 'px';
                rstyle.width = blockSize + 'px';
                rstyle.height = blockSize + 'px';
            }
        }
        let f, a;
        if (GameLayer[0].y > GameLayer[1].y) {
            f = GameLayer[0];
            a = GameLayer[1];
        } else {
            f = GameLayer[1];
            a = GameLayer[0];
        }
        let y = ((_gameBBListIndex) % 10) * blockSize;
        f.y = y;
        f.style[transform] = 'translate3D(0,' + f.y + 'px,0)';
        a.y = -blockSize * Math.floor(f.children.length / 4) + y;
        a.style[transform] = 'translate3D(0,' + a.y + 'px,0)';
    }

    function countBlockSize() {
        blockSize = body.offsetWidth / 4;
        body.style.height = window.innerHeight + 'px';
        GameLayerBG.style.height = window.innerHeight + 'px';
        touchArea[0] = window.innerHeight;
        touchArea[1] = window.innerHeight - blockSize * 3;
    }

    let _gameBBList = [],
        _gameBBListIndex = 0,
        _gameOver = false,
        _gameStart = false,
        _gameSettingNum=20,
        _gameTime, _gameTimeNum, _gameScore, _date1, deviation_time;

    let _gameStartTime, _gameStartDatetime;

    function gameInit() {
        createjs.Sound.registerSound({
            src: "./static/music/err.mp3",
            id: "err"
        });
        createjs.Sound.registerSound({
            src: "./static/music/end.mp3",
            id: "end"
        });
        createjs.Sound.registerSound({
            src: "./static/music/tap.mp3",
            id: "tap"
        });
        gameRestart();
    }

    function gameRestart() {
        _gameBBList = [];
        _gameBBListIndex = 0;
        _gameScore = 0;
        _gameOver = false;
        _gameStart = false;
        _gameTimeNum = _gameSettingNum;
        _gameStartTime = 0;
        _gameStartDatetime = new Date().getTime();
        countBlockSize();
        refreshGameLayer(GameLayer[0]);
        refreshGameLayer(GameLayer[1], 1);
        updatePanel();
    }

    function gameStart() {
        _date1 = new Date();
        _gameStart = true;

        _gameTime = setInterval(timer, 1000);
    }

    function getCPS() {
        let cps = _gameScore / ((new Date().getTime() - _gameStartDatetime) / 1000);
        if (isNaN(cps) || cps === Infinity || _gameStartTime < 2) {
            cps = 0;
        }
        return cps;
    }

    function timer() {
        _gameTimeNum--;
        _gameStartTime++;
        updatePanel();
    }

    function updatePanel() {
        if (mode === MODE_NORMAL) {
            if (_gameTimeNum <= 0) {
                GameTimeLayer.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;时间到！';
                gameOver();
                GameLayerBG.className += ' flash';
                createjs.Sound.play("end");
            } else {
                GameTimeLayer.innerHTML = createTimeText(_gameTimeNum);
            }
        } else if (mode === MODE_ENDLESS) {
            GameTimeLayer.innerHTML = `CPS:${getCPS().toFixed(2)}`;
        } else {
            GameTimeLayer.innerHTML = `SCORE:${_gameScore}`;
        }
    }

    function gameOver() {
        _gameOver = true;
        clearInterval(_gameTime);
        setTimeout(function () {
            GameLayerBG.className = '';
            showGameScoreLayer();
        }, 1500);
    }


    function encrypt(text) {
        let encrypt = new JSEncrypt();
        encrypt.setPublicKey("MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTzGwX6FVKc7rDiyF3H+jKpBlRCV4jOiJ4JR33qZPVXx8ahW6brdBF9H1vdHBAyO6AeYBumKIyunXP9xzvs1qJdRNhNoVwHCwGDu7TA+U4M7G9FArDG0Y6k4LbS0Ks9zeRBMiWkW53yQlPshhtOxXCuZZOMLqk1vEvTCODYYqX5QIDAQAB");
        return encrypt.encrypt(text);
    }

    function SubmitResults() {
        let system = "其他操作系统";
        let area = "异世界";
        if (document.getElementById("username").value && _gameSettingNum==20) {
            if (navigator.appVersion.indexOf("Win") !== -1) system = "Windows";
            if (navigator.appVersion.indexOf("Mac") !== -1) system = "Macintosh";
            if (navigator.appVersion.indexOf("Linux") !== -1) system = "Linux";
            if (navigator.appVersion.indexOf("Android") !== -1) system = "Android";
            if (navigator.appVersion.indexOf("like Mac") !== -1) system = "iOS";
            if (returnCitySN && returnCitySN['cname']) {
                area = returnCitySN['cname']
            }
            let httpRequest = new XMLHttpRequest();
            httpRequest.open('POST', './SubmitResults.php', true);
            httpRequest.setRequestHeader("Content-type", "application/json");
            let name = document.getElementById("username").value;
            let message = document.getElementById("message").value;
            let test = "|_|";
            httpRequest.send(encrypt(_gameScore + test + name + test + tj + test + system + test + area + test + message));
        }
    }

    function createTimeText(n) {
        return '&nbsp;TIME:' + Math.ceil(n);
    }

    let _ttreg = / t{1,2}(\d+)/,
        _clearttClsReg = / t{1,2}\d+| bad/;

    function refreshGameLayer(box, loop, offset) {
        let i = Math.floor(Math.random() * 1000) % 4 + (loop ? 0 : 4);
        for (let j = 0; j < box.children.length; j++) {
            let r = box.children[j],
                rstyle = r.style;
            rstyle.left = (j % 4) * blockSize + 'px';
            rstyle.bottom = Math.floor(j / 4) * blockSize + 'px';
            rstyle.width = blockSize + 'px';
            rstyle.height = blockSize + 'px';
            r.className = r.className.replace(_clearttClsReg, '');
            if (i === j) {
                _gameBBList.push({
                    cell: i % 4,
                    id: r.id
                });
                r.className += ' t' + (Math.floor(Math.random() * 1000) % 5 + 1);
                r.notEmpty = true;
                i = (Math.floor(j / 4) + 1) * 4 + Math.floor(Math.random() * 1000) % 4;
            } else {
                r.notEmpty = false;
            }
        }
        if (loop) {
            box.style.webkitTransitionDuration = '0ms';
            box.style.display = 'none';
            box.y = -blockSize * (Math.floor(box.children.length / 4) + (offset || 0)) * loop;
            setTimeout(function () {
                box.style[transform] = 'translate3D(0,' + box.y + 'px,0)';
                setTimeout(function () {
                    box.style.display = 'block';
                }, 100);
            }, 200);
        } else {
            box.y = 0;
            box.style[transform] = 'translate3D(0,' + box.y + 'px,0)';
        }
        box.style[transitionDuration] = '150ms';
    }

    function gameLayerMoveNextRow() {
        for (let i = 0; i < GameLayer.length; i++) {
            let g = GameLayer[i];
            g.y += blockSize;
            if (g.y > blockSize * (Math.floor(g.children.length / 4))) {
                refreshGameLayer(g, 1, -1);
            } else {
                g.style[transform] = 'translate3D(0,' + g.y + 'px,0)';
            }
        }
    }

    function gameTapEvent(e) {
        if (_gameOver) {
            return false;
        }
        let tar = e.target;
        let y = e.clientY || e.targetTouches[0].clientY,
            x = (e.clientX || e.targetTouches[0].clientX) - body.offsetLeft,
            p = _gameBBList[_gameBBListIndex];
        if (y > touchArea[0] || y < touchArea[1]) {
            return false;
        }
        if ((p.id === tar.id && tar.notEmpty) || (p.cell === 0 && x < blockSize) || (p.cell === 1 && x > blockSize && x < 2 *
            blockSize) || (p.cell === 2 && x > 2 * blockSize && x < 3 * blockSize) || (p.cell === 3 && x > 3 * blockSize)) {
            if (!_gameStart) {
                gameStart();
            }
            createjs.Sound.play("tap");
            tar = document.getElementById(p.id);
            tar.className = tar.className.replace(_ttreg, ' tt$1');
            _gameBBListIndex++;
            _gameScore++;

            updatePanel();

            gameLayerMoveNextRow();
        } else if (_gameStart && !tar.notEmpty) {
            createjs.Sound.play("err");
            tar.classList.add('bad');
            if (mode === MODE_PRACTICE) {
                setTimeout(() => {
                    tar.classList.remove('bad');
                }, 500);
            } else {
                gameOver();
            }
        }
        return false;
    }

    function createGameLayer() {
        let html = '<div id="GameLayerBG">';
        for (let i = 1; i <= 2; i++) {
            let id = 'GameLayer' + i;
            html += '<div id="' + id + '" class="GameLayer">';
            for (let j = 0; j < 10; j++) {
                for (let k = 0; k < 4; k++) {
                    html += '<div id="' + id + '-' + (k + j * 4) + '" num="' + (k + j * 4) + '" class="block' + (k ? ' bl' : '') +
                        '"></div>';
                }
            }
            html += '</div>';
        }
        html += '</div>';
        html += '<div id="GameTimeLayer"></div>';
        return html;
    }

    function closeWelcomeLayer() {
        welcomeLayerClosed = true;
        let l = document.getElementById('welcome');
        l.style.display = 'none';
        updatePanel();
    }

    function showWelcomeLayer() {
        welcomeLayerClosed = false;
        let l = document.getElementById('welcome');
        l.style.display = 'block';
    }

    function getBestScore(score) {
        // 练习模式不会进入算分界面
        let cookieName = (mode === MODE_NORMAL ? 'bast-score' : 'endless-best-score');
        let best = cookie(cookieName) ? Math.max(parseFloat(cookie(cookieName)), score) : score;
        cookie(cookieName, best.toFixed(2), 100);
        return best;
    }

    function scoreToString(score) {
        return mode === MODE_ENDLESS ? score.toFixed(2) : score.toString();
    }

    function showGameScoreLayer() {
        let l = document.getElementById('GameScoreLayer');
        let c = document.getElementById(_gameBBList[_gameBBListIndex - 1].id).className.match(_ttreg)[1];
        let score = (mode === MODE_ENDLESS ? parseFloat(getCPS().toFixed(2)) : _gameScore);
        let best = getBestScore(score);
        score = scoreToString(score);
        l.className = l.className.replace(/bgc\d/, 'bgc' + c);
        document.getElementById('GameScoreLayer-text').innerHTML = shareText(score);
        let score_text = '得分&nbsp;&nbsp;';
        let normalCond = deviation_time < (_gameSettingNum+3)*1000 || mode !== MODE_NORMAL;
        score_text += normalCond ? score : "<span style='color:red;'>" + score + "</span>";
        //显示CPS
        score_text += getCPS() && mode!=MODE_ENDLESS ? '<br>CPS&nbsp;' + getCPS().toFixed(2) : '' //获取CPS
        document.getElementById('GameScoreLayer-score').innerHTML = score_text;
        document.getElementById('GameScoreLayer-bast').innerHTML = '最佳&nbsp;&nbsp;' + scoreToString(best);
        l.style.display = 'block';
    }

    function hideGameScoreLayer() {
        let l = document.getElementById('GameScoreLayer');
        l.style.display = 'none';
    }

    w.replayBtn = function() {
        gameRestart();
        hideGameScoreLayer();
    }

    w.backBtn = function() {
        gameRestart();
        hideGameScoreLayer();
        showWelcomeLayer();
    }

    function shareText(score) {
        if (mode === MODE_NORMAL) {
            let date2 = new Date();
            deviation_time = (date2.getTime() - _date1.getTime())
            if (deviation_time > (_gameSettingNum+3)*1000) {
                return '倒计时多了' + ((deviation_time / 1000) - 20).toFixed(2) + "s";
            }
            SubmitResults();
        }

        if (mode === MODE_ENDLESS) {
            if (score <= 5) return '试着好好练一下？';
            if (score <= 8) return 'TCL';
            if (score <= 10)  return 'TQL';
            if (score <= 15) return '您';
            return '人？';
        } else {
            if (score <= 49) return '试着好好练一下？';
            if (score <= 99) return 'TCL';
            if (score <= 149) return 'TQL';
            if (score <= 199) return '您';
            return '人？';
        }
    }

    function toStr(obj) {
        if (typeof obj === 'object') {
            return JSON.stringify(obj);
        } else {
            return obj;
        }
    }

    function cookie(name, value, time) {
        if (name) {
            if (value) {
                if (time) {
                    let date = new Date();
                    date.setTime(date.getTime() + 864e5 * time), time = date.toGMTString();
                }
                return document.cookie = name + "=" + escape(toStr(value)) + (time ? "; expires=" + time + (arguments[3] ?
                    "; domain=" + arguments[3] + (arguments[4] ? "; path=" + arguments[4] + (arguments[5] ? "; secure" : "") : "") :
                    "") : ""), !0;
            }
            return value = document.cookie.match("(?:^|;)\\s*" + name.replace(/([-.*+?^${}()|[\]\/\\])/g, "\\$1") + "=([^;]*)"),
                value = value && "string" == typeof value[1] ? unescape(value[1]) : !1, (/^(\{|\[).+\}|\]$/.test(value) ||
                /^[0-9]+$/g.test(value)) && eval("value=" + value), value;
        }
        let data = {};
        value = document.cookie.replace(/\s/g, "").split(";");
        for (let i = 0; value.length > i; i++) name = value[i].split("="), name[1] && (data[name[0]] = unescape(name[1]));
        return data;
    }

    document.write(createGameLayer());

    function initSetting() {
        document.getElementById("username").value = cookie("username") ? cookie("username") : "";
        document.getElementById("message").value = cookie("message") ? cookie("message") : "";
        document.getElementsByTagName("title")[0].innerText = cookie("title") ? cookie("title") : "吃掉小鹿乃";
        if (cookie("keyboard")) {
            document.getElementById("keyboard").value = cookie("keyboard");
            map = {}
            map[cookie("keyboard").charAt(0).toLowerCase()] = 1;
            map[cookie("keyboard").charAt(1).toLowerCase()] = 2;
            map[cookie("keyboard").charAt(2).toLowerCase()] = 3;
            map[cookie("keyboard").charAt(3).toLowerCase()] = 4;
        }
        if (cookie('gameTime') && !isNaN(cookie('gameTime'))) {
            document.getElementById('gameTime').value=cookie('gameTime');
            _gameSettingNum=cookie('gameTime')
            gameRestart();
        }
    }

    w.show_btn = function() {
        document.getElementById("btn_group").style.display = "block"
        document.getElementById("setting").style.display = "none"
        document.getElementById("desc").style.display = "block"
    }

    w.show_setting = function() {
        document.getElementById("btn_group").style.display = "none"
        document.getElementById("setting").style.display = "block"
        document.getElementById("desc").style.display = "none"
    }

    w.save_cookie = function() {
        cookie('username', document.getElementById("username").value, 100);
        cookie('message', document.getElementById("message").value, 100);
        cookie('keyboard', document.getElementById("keyboard").value, 100);
        cookie('title', document.getElementById("title").value, 100);
        cookie('gameTime', document.getElementById("gameTime").value, 100);
        initSetting();
    }

    function isnull(val) {
        let str = val.replace(/(^\s*)|(\s*$)/g, '');
        return str === '' || str === undefined || str == null;
    }

    w.goRank = function() {
        let name = document.getElementById("username").value;
        let link = './rank.php';
        if (!isnull(name)) {
            link += "?name=" + name;
        }
        window.location.href = link;
    }

    function click(index) {
        if (!welcomeLayerClosed) {
            return;
        }

        let p = _gameBBList[_gameBBListIndex];
        let base = parseInt(document.getElementById(p.id).getAttribute("num")) - p.cell;
        let num = base + index - 1;
        let id = p.id.substring(0, 11) + num;

        let fakeEvent = {
            clientX: ((index - 1) * blockSize + index * blockSize) / 2 + body.offsetLeft,
            // Make sure that it is in the area
            clientY: (touchArea[0] + touchArea[1]) / 2,
            target: document.getElementById(id),
        };

        gameTapEvent(fakeEvent);
    }

    const clickBeforeStyle = document.createElement('style');
    const clickAfterStyle = document.createElement('style');
    document.head.append(clickBeforeStyle);
    document.head.append(clickAfterStyle);

    function saveImage(dom, callback) {
        if (dom.files && dom.files[0]) {
            let reader = new FileReader();
            reader.onload = function() {
                callback(this.result);
            }
            reader.readAsDataURL(dom.files[0]);
        }
    }


    w.getClickBeforeImage = function() {
        const img = document.getElementById('click-before-image');
        img.click();
    }

    w.saveClickBeforeImage = function() {
        const img = document.getElementById('click-before-image');
        saveImage(img, r => {
            clickBeforeStyle.innerHTML = `
                .t1, .t2, .t3, .t4, .t5 {
                   background-size: auto 100%;
                   background-image: url(${r});
            }`;
        })
    }

    w.getClickAfterImage = function() {
        const img = document.getElementById('click-after-image');
        img.click();
    }

    w.saveClickAfterImage = function() {
        const img = document.getElementById('click-after-image');
        saveImage(img, r => {
            clickAfterStyle.innerHTML = `
                .tt1, .tt2, .tt3, .tt4, .tt5 {
                  background-size: auto 86%;
                  background-image: url(${r});
            }`;
        })
    }
}) (window);
