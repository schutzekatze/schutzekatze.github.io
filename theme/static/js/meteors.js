var METEOR_SPAWN_INTERVAL_MIN = 1000;
var METEOR_SPAWN_INTERVAL_MAX = 300000;
var METEOR_SPAWN_MARGINS_X_LEFT = 150;
var METEOR_SPAWN_MARGINS_X_RIGHT = 150;
var METEOR_SPAWN_MARGINS_Y_TOP = 10;
var METEOR_SPAWN_MARGINS_Y_BOTTOM = 400;
var METEOR_LENGTH_MIN = 400;
var METEOR_LENGTH_MAX = 700;
var METEOR_VELOCITY_MIN = 5;
var METEOR_VELOCITY_MAX = 8;
var METEOR_SIZE_MIN = 1;
var METEOR_SIZE_MAX = 4;
var METEOR_OPACITY_DELTA_1 = 0.03;
var METEOR_OPACITY_DELTA_2 = 0.01;
var METEOR_OPACITY_DELTA_SWITCH_RATIO = 2 / 5;
var TRAIL_OPACITY_DELTA = 0.05;
var TRAIL_STEP_FACTOR = 0.5;
var ARC_ORIGIN_MIN_DISTANCE = 2500;
var ARC_ORIGIN_MAX_DISTANCE = 3500;
var ARC_ANGLE_RANGE = Math.PI * 3 / 4;

var canvas = document.getElementById("sky");
var context = canvas.getContext("2d");

var width = $(document).width();
var height = $(document).height();

canvas.width = width;
canvas.height = height;

$(window).resize(function() {
    width = $(document).width();
    height = $(document).height();
    canvas.width = width;
    canvas.height = height;
});

var meteors = [];

function drawMeteor(x, y, size, alpha) {
    var img = new Image;
    img.src = "/theme/images/meteor.png";
    context.globalAlpha = alpha;
    context.drawImage(img, x, y, size, size);
    context.globalAlpha = 1.0;
}

function drawTrail(meteor) {
    var trail = meteor.trail;
    var segments2remove = [];

    for (var i = 0; i < trail.length; i++) {
        var segment = trail[i];

        drawMeteor(segment.x, segment.y, segment.size, segment.opacity);

        if (segment.opacity > TRAIL_OPACITY_DELTA) {
            segment.opacity -= TRAIL_OPACITY_DELTA;
        } else {
            segments2remove.push(i);
        }
    }

    for (var i = 0; i < segments2remove.length; i++) {
        trail.splice(segments2remove[i], 1);
    }
}

function moveMeteor(meteor) {
    if (meteor.distanceTraveled < meteor.distanceMax) {
        meteor.arcAngle += meteor.arcAngleDelta;

        var nx = width / 2 - meteor.arcOriginDistance * Math.cos(meteor.arcOriginAngle)
                - meteor.arcDistance * Math.cos(meteor.arcAngle);

        var ny = meteor.arcOriginDistance * Math.sin(meteor.arcOriginAngle)
                - meteor.arcDistance * Math.sin(meteor.arcAngle);

        var nsize = meteor.size;

        var nopacity = 0;
        if (meteor.distanceTraveled < meteor.distanceMax * METEOR_OPACITY_DELTA_SWITCH_RATIO) {
            if (meteor.opacity < (1 - METEOR_OPACITY_DELTA_1)) {
                nopacity = meteor.opacity + METEOR_OPACITY_DELTA_1;
            } else {
                nopacity = 1;
            }
        } else {
            if (meteor.opacity > METEOR_OPACITY_DELTA_2) {
                nopacity = meteor.opacity - METEOR_OPACITY_DELTA_2;
            } else {
                nopacity = 0;
            }
        }

        var dx = nx - meteor.x;
        var dy = ny - meteor.y;
        var da = Math.atan2(dy, dx);
        var stepx = meteor.trailStep * Math.cos(da);
        var stepy = meteor.trailStep * Math.sin(da);
        var steps = meteor.trailStepCount;

        for (var step = 0; step < steps; step++) {
            ratio1 = (steps - step) / steps;
            ratio2 = step / steps;

            meteor.trail.push({
                x: meteor.x + step * stepx,
                y: meteor.y + step * stepy,
                size: meteor.size * ratio1 + nsize * ratio2,
                opacity: meteor.opacity * ratio1 + nopacity * ratio2
            });
        }

        meteor.x = nx;
        meteor.y = ny;
        meteor.distanceTraveled += meteor.vel;
        meteor.opacity = nopacity;
    }

    if (meteor.distanceTraveled >= meteor.distanceMax && meteor.trail.length == 0) {
        return true;
    }
}

function graphicsUpdate() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    var meteors2remove = [];

    for (var i = 0; i < meteors.length; i++) {
        meteor = meteors[i];

        drawTrail(meteor);
        if (moveMeteor(meteor)) {
            meteors2remove.push(i);
        }
    }

    for (var i = 0; i < meteors2remove.length; i++) {
        meteors.splice(meteors2remove[i], 1);
    }

    requestAnimationFrame(graphicsUpdate);
}

function spawnMeteor() {
    var meteorX = Math.round(Math.random() *
        (width - METEOR_SPAWN_MARGINS_X_LEFT - METEOR_SPAWN_MARGINS_X_RIGHT)
        + METEOR_SPAWN_MARGINS_X_LEFT);
    var meteorY = Math.round(Math.random() *
        (height - METEOR_SPAWN_MARGINS_Y_TOP - METEOR_SPAWN_MARGINS_Y_BOTTOM)
        + METEOR_SPAWN_MARGINS_Y_TOP);
    var meteorSize = Math.round(Math.random() *
        (METEOR_SIZE_MAX - METEOR_SIZE_MIN) + METEOR_SIZE_MIN);
    var meteorVel = Math.round(Math.random() *
        (METEOR_VELOCITY_MAX - METEOR_VELOCITY_MIN) + METEOR_VELOCITY_MIN);
    var meteorLength = Math.round(Math.random() *
        (METEOR_LENGTH_MAX - METEOR_LENGTH_MIN) + METEOR_LENGTH_MIN);

    var meteorArcOriginAngle = Math.random() * ARC_ANGLE_RANGE + (Math.PI - ARC_ANGLE_RANGE) / 2;
    var meteorArcOriginDistance = Math.round(Math.random() *
            (ARC_ORIGIN_MAX_DISTANCE - ARC_ORIGIN_MIN_DISTANCE) + ARC_ORIGIN_MIN_DISTANCE);

    var dx = (width / 2 - meteorArcOriginDistance * Math.cos(meteorArcOriginAngle)) - meteorX;
    var dy = (            meteorArcOriginDistance * Math.sin(meteorArcOriginAngle)) - meteorY;

    var meteorArcAngle = Math.atan2(dy, dx);
    var meteorArcDistance = Math.sqrt(dx*dx + dy*dy);

    var meteorArcAngleDelta = meteorVel / meteorArcDistance;
    if (meteorArcOriginAngle > Math.PI / 2) {
        meteorArcAngleDelta = -meteorArcAngleDelta;
    }

    meteorStep = Math.sqrt(meteorSize) * TRAIL_STEP_FACTOR;
    meteorStepCount = Math.floor(meteorVel / meteorStep);
    if (meteorStepCount == 0) {
        meteorStepCount = 1;
    }

    meteors.push({
        x: meteorX,
        y: meteorY,
        size: meteorSize,
        vel: meteorVel,
        opacity: 0,
        distanceTraveled: 0,
        distanceMax: meteorLength,
        trail: [],
        trailStep: meteorStep,
        trailStepCount: meteorStepCount,
        arcOriginAngle: meteorArcOriginAngle,
        arcOriginDistance: meteorArcOriginDistance,
        arcAngle: meteorArcAngle,
        arcAngleDelta: meteorArcAngleDelta,
        arcDistance: meteorArcDistance
    });
}

function randomLoop() {
    var delay = Math.round(Math.random() *
        (METEOR_SPAWN_INTERVAL_MAX - METEOR_SPAWN_INTERVAL_MIN)) + METEOR_SPAWN_INTERVAL_MIN;

    setTimeout(function() {
        if (document.hasFocus()) {
            spawnMeteor();
        }
        randomLoop();
    }, delay);
}

$(function() {
    randomLoop();
    graphicsUpdate();
});
