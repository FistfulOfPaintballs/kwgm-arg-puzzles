var width = window.innerWidth;
var height = window.innerHeight - 50;

var stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
});

var container = stage.container();

var layer = new Konva.Layer();
stage.add(layer);

var tr = new Konva.Transformer({
    rotationSnaps: [],
});
layer.add(tr);

const targetWidth = 1024
const targetHeight = 768

const margin = 100
const arbitraryScaleFactor = 3
const maxPieceWidth = 325

const widthScale = stage.width() / targetWidth
const heightScale = stage.height() / targetHeight
const scale = Math.min(widthScale, heightScale)
const puzzlePieceScaleFactor = scale / arbitraryScaleFactor

const arrowDelta = 1;

var puzzleGrid
var puzzlePieces = []
var letters = []
var showTooltips = false

var flipped = false

var originalJson
var exportPiecesBelowY = 150 * scale

function getCurrentPuzzle(){
    const urlParams = new URLSearchParams(window.location.search);
    const puzzle = urlParams.get('puzzle')
    if (!puzzle){
        return "red"
    }
    return puzzle
}

document.addEventListener("DOMContentLoaded", () => {
    const puzzle = getCurrentPuzzle()
    if (!!puzzle){
        let options = document.getElementById('puzzleDropdown').options;
        for (let i in options) {
            if (options[i].value===puzzle) {
                options[i].selected= true;
                break;
            }
        }
    }
});

function drawImage(imageObj, letter, username, location, scaleX, scaleY, rotation, filename) {
    let width = imageObj.width * puzzlePieceScaleFactor
    let height = imageObj.height * puzzlePieceScaleFactor
    let fontSize = (20 * scale)

    var puzzlePieceGroup = new Konva.Group({
        width: width,
        height: height,
        draggable: true,
        name: 'puzzlepieceGroup',
    })
    var puzzlePieceImg = new Konva.Image({
        image: imageObj,
        width: width,
        height: height,
        name: 'puzzlepiece',
    });
    var puzzlePieceText = new Konva.Text({
        text: letter,
        fontSize: fontSize,
        fontFamily: 'Dutch811',
        fill: '#FFFFFF',
        padding: 5,
        x: (width / 2) - (fontSize / 2),
        y: (height / 2) - (fontSize / 2),
        name: 'letter',
        align: 'center',
        verticalAlign: 'middle',
        stroke: '#000000',
        strokeWidth: Math.round(4 * scale),
        fillAfterStrokeEnabled: true,
        listening: false,
        visible: true,
    })

    puzzlePieceImg.setAttr('filename', filename)

    puzzlePieceGroup.add(puzzlePieceImg)
    puzzlePieceGroup.add(puzzlePieceText)

    if (scaleX !== 1 || scaleY !== 1){
        puzzlePieceGroup.scale({x: scaleX, y: scaleY})
        puzzlePieceText.scale({x: 1/scaleX, y: 1/scaleY})
    }
    if (rotation !== 0) {
        puzzlePieceGroup.rotate(rotation)
        puzzlePieceText.rotate(-rotation)
    }

    puzzlePieces.push(puzzlePieceGroup)
    letters.push(puzzlePieceText)

    let tooltip = document.getElementById("tooltip")
    let submittedBy = document.getElementById("submittedBy")
    let tooltipLocation = document.getElementById("location")
    let tooltipLetter = document.getElementById("letter")
    let tooltipCoords = document.getElementById("coords")
    let tooltipScaleXY = document.getElementById("scaleXY")
    let tooltipRotation = document.getElementById("rotation")

    tooltip.listening = false

    // add styling
    puzzlePieceImg.cache()
    puzzlePieceImg.on('mouseenter', function () {
        puzzleHoverActive = true
        document.body.style.cursor = 'pointer';
        puzzlePieceImg.filters([Konva.Filters.Brighten])
        puzzlePieceImg.brightness(-0.35)

        if (!!showTooltips){
            var containerRect = container.getBoundingClientRect();
            tooltip.style.display = 'initial';
            tooltip.style.top = containerRect.top + puzzlePieceImg.absolutePosition().y + (puzzlePieceImg.height() / 2) + 'px'
            tooltip.style.left = containerRect.left + puzzlePieceImg.absolutePosition().x + (puzzlePieceImg.width() / 2) + 'px'
            submittedBy.innerText = username;
            tooltipLocation.innerText = location
            tooltipLetter.innerText = letter;
            let x = Math.round(puzzlePieceImg.absolutePosition().x / scale)
            let y = Math.round(puzzlePieceImg.absolutePosition().y / scale)
            tooltipCoords.innerText = `(${x}, ${y})`

            let scaleX = puzzlePieceGroup.getAttr('scaleX').toFixed(3)
            let scaleY = puzzlePieceGroup.getAttr('scaleY').toFixed(3)
            let rotationVal = puzzlePieceGroup.getAttr('rotation').toFixed(3)
            tooltipScaleXY.innerText = `(${scaleX}, ${scaleY})`
            tooltipRotation.innerText = `${rotationVal}`
        }
    });

    puzzlePieceImg.on('mouseleave', function () {
        puzzleHoverActive = false
        document.body.style.cursor = 'default';
        if (!!showTooltips){
            tooltip.style.display = 'none';
        }
        puzzlePieceImg.filters([])
    });

    layer.add(puzzlePieceGroup);
    return puzzlePieceGroup
}

function drawPuzzleGrid(){
    var puzzleGridImg = new Image()
    puzzleGridImg.src = "./static/img/puzzlegrid.png"
    puzzleGridImg.onload = function(){
        puzzleGrid = new Konva.Image({
            image: puzzleGridImg,
            x: 30 * scale,
            y: exportPiecesBelowY + (20 * scale),
            width: puzzleGridImg.width * puzzlePieceScaleFactor,
            height: puzzleGridImg.height * puzzlePieceScaleFactor,
            name: 'puzzleGrid',
            opacity: 0.25,
            visible: true,
            listening: false
        })
        layer.add(puzzleGrid)
    }
}

function drawUnclaimedPieceArea(){
    var dottedLine = new Konva.Line({
        points: [0, exportPiecesBelowY, stage.width(), exportPiecesBelowY],
        stroke: 'black',
        strokeWidth: 3,
        lineCap: 'round',
        lineJoin: 'round',
        color: '#333333',
        dash: [15, 20],
        listening: false
    });
    layer.add(dottedLine)
    var unclaimedPiecesText = new Konva.Text({
        text: "Any changes made to pieces in this section will not be exported",
        fontSize: 16,
        fontFamily: 'Lato',
        x: 0,
        y: (exportPiecesBelowY / 2),
        width: stage.width(),
        height: (exportPiecesBelowY / 2),
        fill: '#333333',
        align: 'center',
        verticalAlign: 'middle',
        listening: false
    })
    layer.add(unclaimedPiecesText)
}

function drawInstructions(){
    let width = 50
    let helpMenu = document.getElementById("instructions")
    helpMenu.style.display = "none"

    var instructionsGroup = new Konva.Group({
        width: width,
        height: parseInt(width),
        x: stage.width() - width - 15,
        y: parseInt(width),
        name: 'instructions',
    })
    var instructionsCircle = new Konva.Circle({
        radius: width / 2,
        fill: "#4287f5",
        shadowBlur: 6,
        shadowOffset: {x: 2, y: 2},
        shadowColor: "#666",
        name: 'instructions',
    });
    var instructionsQuestionMark = new Konva.Text({
        text: "?",
        x: -7,
        y: -15,
        align: 'center',
        verticalAlign: 'middle',
        fontSize: 36,
        fontStyle: 'bold',
        fontFamily: 'Lato',
        fill: "#FFFFFF",
        listening: false,
    })
    instructionsGroup.add(instructionsCircle)
    instructionsGroup.add(instructionsQuestionMark)
    layer.add(instructionsGroup);

    instructionsCircle.cache()
    instructionsCircle.on('mouseover', function () {
        document.body.style.cursor = 'pointer';
        instructionsCircle.filters([Konva.Filters.Brighten])
        instructionsCircle.brightness(-0.1)
    });

    instructionsGroup.on('mouseout', function () {
        document.body.style.cursor = 'default';
        instructionsCircle.filters([])
    });

    instructionsCircle.on('click tap', function(e){
        // show menu
        if (helpMenu.style.display === 'none'){
            helpMenu.style.display = 'initial';
            var containerRect = container.getBoundingClientRect();
            helpMenu.style.top = containerRect.top + instructionsCircle.absolutePosition().y - 5 + 'px';
            helpMenu.style.left = containerRect.left + instructionsCircle.absolutePosition().x - 25 - 400 + 'px';
        } else {
            helpMenu.style.display = 'none';
        }
    })

}

const getMetadata = (url, cb) => {
    const img = new Image();
    img.onload = () => cb(null, img);
    img.onerror = (err) => cb(err);
    img.src = url;
};

// Add selection rectangle
var selectionRectangle = new Konva.Rect({
    fill: "#e6e6e6",
    visible: false,
    stroke: "#b3b3b3",
    strokeWidth: 2,
    dash: [10, 10]
});
layer.add(selectionRectangle);

// Lay Out Pieces
fetch(`./static/img/${getCurrentPuzzle()}/0_pieces.json`)
    .then((response) => response.json())
    .then((json) => {
        originalJson = json
        let pieces = json["pieces"]

        var xPos = 0
        var row = 0
        let spacerMargin = margin / 4

        for (let p in pieces) {
            (function(e) {
                let filename = pieces[p]["filename"];
                var x = pieces[p]["x"]
                var y = pieces[p]["y"]

                let letter = pieces[p]["letter"]
                let username = pieces[p]["username"]
                let location = pieces[p]["location"]

                let scaleX = pieces[p]["scaleX"]
                let scaleY = pieces[p]["scaleY"]
                let rotation = pieces[p]["rotation"]

                var puzzlePieceObj = new Image();
                puzzlePieceObj.onload = function() {
                    let puzzlePieceImg = drawImage(this, letter, username, location, scaleX, scaleY, rotation, filename);
                    if (x === -1 || y === -1){
                        // No position listed (unmatched piece)
                        let imgWidth = puzzlePieceImg.attrs.width
                        if ((xPos + imgWidth) >= stage.width()) {
                            row += 1
                            xPos = 0
                        }
                        x = xPos
                        xPos += imgWidth
                        y = maxPieceWidth * row * puzzlePieceScaleFactor
                    } else {
                        // Piece has an (x,y) coord
                        x = scale * x
                        y = scale * y
                    }
                    puzzlePieceImg.attrs.x = x
                    puzzlePieceImg.attrs.y = y
                };
                puzzlePieceObj.src = `./static/img/${getCurrentPuzzle()}/${filename}`;
            })(p);
        }
    });


stage.add(layer);

drawPuzzleGrid()
drawUnclaimedPieceArea()
drawInstructions()

var x1, y1, x2, y2;
stage.on('mousedown touchstart', (e) => {
    // do nothing if we mousedown on any shape
    if (e.target !== stage) {
        return;
    }
    e.evt.preventDefault();
    x1 = stage.getPointerPosition().x;
    y1 = stage.getPointerPosition().y;
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.visible(true);
    selectionRectangle.width(0);
    selectionRectangle.height(0);
});

stage.on('mousemove touchmove', (e) => {
    // do nothing if we didn't start selection
    if (!selectionRectangle.visible()) {
        return;
    }
    e.evt.preventDefault();
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.setAttrs({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
    });
});

stage.on('mouseup touchend', (e) => {
    // do nothing if we didn't start selection
    if (!selectionRectangle.visible()) {
        return;
    }
    e.evt.preventDefault();
    // update visibility in timeout, so we can check it in click event
    setTimeout(() => {
        selectionRectangle.visible(false);
    });

    var shapes = stage.find('.puzzlepieceGroup');
    var box = selectionRectangle.getClientRect();
    var selected = shapes.filter((shape) =>
        Konva.Util.haveIntersection(box, shape.getClientRect())
    );
    tr.nodes(selected);
});

// clicks should select/deselect shapes
stage.on('click tap', function (e) {
    if (!e.target.hasName('instructions')) {
        let helpMenu = document.getElementById("instructions");
        helpMenu.style.display = 'none';
    }

    // if we are selecting with rect, do nothing
    if (selectionRectangle.visible()) {
        return;
    }

    // Unselect if click on empty area
    if (e.target === stage) {
        tr.nodes([]);
        return;
    }

    // do nothing if clicked NOT on our rectangles
    if (!e.target.hasName('puzzlepiece')) {
        return;
    }

    // do we pressed shift or ctrl?
    const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    const isSelected = tr.nodes().indexOf(e.target) >= 0;

    if (!metaPressed && !isSelected) {
        // Select if not selected (if no key pressed)
        tr.nodes([e.target]);
    } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(e.target), 1);
        tr.nodes(nodes);
    } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = tr.nodes().concat([e.target]);
        tr.nodes(nodes);
    }

    // To prevent bugs with rotation and text: Add the nodes parents (puzzlepieceGroup)
    // to the transformer instead
    let oldNodes = tr.nodes()
    var newNodes = []
    for (let i in oldNodes){
        let node = oldNodes[i]
        if (node.hasName('puzzlepiece')){
            newNodes.push(node.getParent())
        } else {
            newNodes.push(node)
        }
    }
    tr.nodes(newNodes)

});

stage.on('dblclick', function(e){
    // Reset transformation on doubleclick
    var setToOriginal = false
    if (e.target.hasName('puzzlepiece')) {
        let group = tr.nodes()[0]
        if (!!group){
            let piece = e.target
            let filename = piece.getAttr('filename')

            for (let i in originalJson["pieces"]){
                let originalPiece = originalJson["pieces"][i]
                if (originalPiece["filename"] === filename){
                    // If we can find a match, set position to match original json
                    let x = originalPiece["x"]
                    let y = originalPiece["y"]
                    if (x !== -1 && y !== -1){
                        group.setAttrs({
                            x: x * scale,
                            y: y * scale,
                        })
                    }
                    group.setAttrs({
                        scaleX: originalPiece["scaleX"],
                        scaleY: originalPiece["scaleY"],
                        rotation: originalPiece["rotation"],
                    })
                    setToOriginal = true
                }
            }

            if (!setToOriginal){
                // Else, set to default
                group.setAttrs({
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                })
            }
        }
    }
})

document.getElementById("showLetters").addEventListener('change', function() {
    if (this.checked) {
        for (let l in letters) {
            letters[l].show();
        }
    } else {
        for (let l in letters) {
            letters[l].hide();
        }
    }
});

document.getElementById("showGrid").addEventListener('change', function() {
    if (this.checked) {
        puzzleGrid.show();
    } else {
        puzzleGrid.hide();
    }
});

// Move with arrow keys
window.addEventListener('keydown', function (e) {
    let nodes = tr.nodes()

    var delta = arrowDelta;
    if (e.shiftKey){
        delta *= 10
    }

    switch (e.code){
        case "ArrowLeft":
            for (let i in nodes){
                nodes[i].x(nodes[i].x() - delta);
            }
            break;
        case "ArrowUp":
            for (let i in nodes){
                nodes[i].y(nodes[i].y() - delta);
            }
            break;
        case "ArrowRight":
            for (let i in nodes){
                nodes[i].x(nodes[i].x() + delta);
            }
            break;
        case "ArrowDown":
            for (let i in nodes){
                nodes[i].y(nodes[i].y() + delta);
            }
            break;
        default:
            return
    }
    e.preventDefault();
});

document.getElementById("showTooltips").addEventListener('change', function() {
    showTooltips = this.checked
});

document.getElementById("rotationSnap").addEventListener('change', function() {
    if (this.checked){
        tr.rotationSnaps([0, 90, 180, 270]);
    } else {
        tr.rotationSnaps([]);
    }
});

document.getElementById("selectPuzzle").addEventListener("change", (event) => {
    let url = window.location.href.split('?')[0];
    window.location.href = `${url}?puzzle=${event.target.value}`;
});

document.getElementById("flipButton").addEventListener("click", (e) => {
    flipped = !flipped

    if (!!flipped){
        e.target.innerText = "Unflip"
    } else {
        e.target.innerText = "Flip"
    }

    puzzleGrid.setAttrs({
        offsetX: flipped? puzzleGrid.width() : 0,
        scaleX: flipped? -1 : 1
    })

    let fontSize = (20 * scale)
    for (let i in puzzlePieces){
        let group = puzzlePieces[i]
        if (group.y() > exportPiecesBelowY){
            group.setAttrs({
                scaleX: group.scaleX() * -1,
                x: (puzzleGrid.width() + (60 * scale)) - group.x(),
                rotation: (360 - group.rotation())
            })
            let nodes = group.getChildren(function(node){
                return node.hasName('letter')
            })
            var letter = nodes[0]
            letter.setAttrs({
                offsetX: flipped ? letter.width() : 0,
                x: (group.width() / 2) - (fontSize / 2),
                scaleX: letter.scaleX() * -1,
            })
        }
    }
});

document.getElementById("exportJson").addEventListener("click", function(e){
    var exportJson = structuredClone(originalJson)

    var pieces = stage.find('.puzzlepiece')
    for (let i in pieces){
        let piece = pieces[i]
        let group = piece.getParent()

        let x = Math.round(piece.absolutePosition().x / scale)
        let y = Math.round(piece.absolutePosition().y / scale)
        if (y >= (exportPiecesBelowY / scale)){
            var scaleX = Math.round((group.getAttr('scaleX') * 1e3)) / 1e3
            var scaleY = Math.round((group.getAttr('scaleY') * 1e3)) / 1e3
            var rotation = Math.round((group.getAttr('rotation') * 1e3)) / 1e3

            if (scaleX == 1.000){
                scaleX = 1
            }
            if (scaleY == 1.000){
                scaleY = 1
            }
            if (rotation == 0.000){
                rotation = 0
            }

            let filename = piece.getAttr('filename')
            for (let j in exportJson["pieces"]){
                let originalPiece = exportJson["pieces"][j]
                if (originalPiece['filename'] === filename){
                    exportJson["pieces"][j]["x"] = x
                    exportJson["pieces"][j]["y"] = y
                    exportJson["pieces"][j]["scaleX"] = scaleX
                    exportJson["pieces"][j]["scaleY"] = scaleY
                    exportJson["pieces"][j]["rotation"] = rotation
                }
            }
        }

    }

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportJson, null, 2));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `0_pieces_${getCurrentPuzzle()}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
})