var width = window.innerWidth;
var height = window.innerHeight - 50;

var stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
});

var layer = new Konva.Layer();
stage.add(layer);

var tr = new Konva.Transformer();
layer.add(tr);

const targetWidth = 1024
const targetHeight = 768

const margin = 100
const numPiecesAcross = 8
const maxPieceWidth = 650

const widthScale = stage.width() / targetWidth
const heightScale = stage.height() / targetHeight
const puzzlePieceScaleFactor = Math.min(widthScale, heightScale) / numPiecesAcross

var letters = []

function drawImage(imageObj, letter, username) {
    let width = imageObj.width * puzzlePieceScaleFactor
    let height = imageObj.height * puzzlePieceScaleFactor
    let fontSize = 24

    var puzzlePieceGroup = new Konva.Group({
        width: width,
        height: height,
        draggable: true,
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
        align: 'center',
        verticalAlign: 'middle',
        shadowEnabled: true,
        shadowColor: "#000000",
        shadowBlur: 4,
        visible: false
    })

    puzzlePieceGroup.add(puzzlePieceImg)
    puzzlePieceGroup.add(puzzlePieceText)

    puzzlePieceText.on('click tap', function(e) {
        const isSelected = tr.nodes().indexOf(e.target) >= 0;
        if (!isSelected) {
            tr.nodes([puzzlePieceImg]);
        }
    })

    letters.push(puzzlePieceText)

    // add styling
    puzzlePieceImg.cache()
    puzzlePieceGroup.on('mouseover', function () {
        document.body.style.cursor = 'pointer';
        puzzlePieceImg.filters([Konva.Filters.Brighten])
        puzzlePieceImg.brightness(-0.5)
    });

    puzzlePieceGroup.on('mouseout', function () {
        document.body.style.cursor = 'default';
        puzzlePieceImg.filters([])
    });

    layer.add(puzzlePieceGroup);
    return puzzlePieceGroup
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

fetch('./static/img/0_pieces.json')
    .then((response) => response.json())
    .then((json) => {
        let pieces = json["pieces"];

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

                var puzzlePieceObj = new Image();
                puzzlePieceObj.onload = function() {
                    let puzzlePieceImg = drawImage(this, letter, username);
                    if (x === -1 || y === -1){
                        let imgWidth = puzzlePieceImg.attrs.width
                        if ((xPos + imgWidth) >= stage.width()) {
                            row += 1
                            xPos = 0
                        }
                        x = xPos
                        xPos += imgWidth
                        y = maxPieceWidth * row * puzzlePieceScaleFactor
                    } else {
                        let translationScale = Math.min(widthScale, heightScale)
                        x = translationScale * x
                        y = translationScale * y
                    }
                    puzzlePieceImg.attrs.x = x
                    puzzlePieceImg.attrs.y = y
                };
                puzzlePieceObj.src = "./static/img/" + filename;
            })(p);
        }
    });


stage.add(layer);


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

    var shapes = stage.find('.puzzlepiece');
    var box = selectionRectangle.getClientRect();
    var selected = shapes.filter((shape) =>
        Konva.Util.haveIntersection(box, shape.getClientRect())
    );
    tr.nodes(selected);
});

// clicks should select/deselect shapes
stage.on('click tap', function (e) {
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
});

stage.on('dblclick', function(e){
    // Reset transformation on doubleclick
    if (e.target.hasName('puzzlepiece')) {
        e.target.setAttrs({
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
        })
    }
})

document.querySelector("#showLetters").addEventListener('change', function() {
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
