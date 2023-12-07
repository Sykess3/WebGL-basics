'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let scale = 1.0;
let AmbientColor = [0.1, 0.1, 0.1];
let DiffuseColor = [0.7, 0.1, 0.1];
let SpecularColor = [0.97, 0.97, 0.97];
let Shininess = 12;
let LightIntensity = 1;
let World_X = -1;
let World_Y = 0;
let World_Z = -10;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormalVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormalVertex);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;


    this.iAttribVertex = -1;
    this.iNormalVertex = -1;

    this.iModelViewProjectionMatrix = -1;
    this.iWorldInverseTranspose = -1;

    this.iLSAmbientColor = -1;
    this.iLSDiffuseColor = -1;
    this.iLSSpecularColor = -1;

    this.iMatAmbientColor = -1;
    this.iMatDiffuseColor = -1;
    this.iMatSpecularColor = -1;
    this.iMatShininess = -1;

    this.iLightDirection = -1;
    this.iCamWorldPosition = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    /* Set the values of the projection transformation */
    let projection = m4.perspective(scale, 2, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let WorldMatrix = m4.translation(World_X, World_Y, World_Z);
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(WorldMatrix, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    var worldInverseMatrix = m4.inverse(matAccum1);
    var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iWorldInverseTranspose, false, worldInverseTransposeMatrix);

    gl.uniform3fv(shProgram.iMatAmbientColor, AmbientColor);
    gl.uniform3fv(shProgram.iMatDiffuseColor, DiffuseColor);
    gl.uniform3fv(shProgram.iMatSpecularColor, SpecularColor);
    gl.uniform1f(shProgram.iMatShininess, Shininess);

    gl.uniform3fv(shProgram.iLSAmbientColor, [0.1, 0.1, 0.1]);
    gl.uniform3fv(shProgram.iLSDiffuseColor, [LightIntensity, LightIntensity, LightIntensity]);
    gl.uniform3fv(shProgram.iLSSpecularColor, [1, 1, 1]);

    gl.uniform3fv(shProgram.iCamWorldPosition, [0, 0, -20]);
    gl.uniform3fv(shProgram.iLightDirection, [0, 0, 1]);
    surface.Draw();
}


function CreateSurfaceData() {
    let vertexList = [];
    let normalsList = [];

    let phiMax = Math.PI * 2;
    let phiMin = 0;
    let vMax = Math.PI * 0.5;
    let vMin = 0;
    let phiStep = phiMax / 50;
    let vStep = vMax / 50;

    for (let phi = phiMin; phi < phiMax + phiStep; phi += phiStep) {
        for (let v = vMin; v < vMax + vStep; v += vStep) {
            let vert = CalculateCorrugatedSpherePoint(phi, v)
            let n1 = CalcAnalyticNormal(phi, v, vert)
            let avert = CalculateCorrugatedSpherePoint(phi + phiStep, v)
            let n2 = CalcAnalyticNormal(phi + phiStep, v, avert)
            let bvert = CalculateCorrugatedSpherePoint(phi, v + vStep)
            let n3 = CalcAnalyticNormal(phi, v + vStep, bvert)
            let cvert = CalculateCorrugatedSpherePoint(phi + phiStep, v + vStep)
            let n4 = CalcAnalyticNormal(phi + phiStep, v + vStep, cvert)

            vertexList.push(vert.x, vert.y, vert.z)
            normalsList.push(n1.x, n1.y, n1.z)
            vertexList.push(avert.x, avert.y, avert.z)
            normalsList.push(n2.x, n2.y, n2.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
            normalsList.push(n3.x, n3.y, n3.z)

            vertexList.push(avert.x, avert.y, avert.z)
            normalsList.push(n2.x, n2.y, n2.z)
            vertexList.push(cvert.x, cvert.y, cvert.z)
            normalsList.push(n4.x, n4.y, n4.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
            normalsList.push(n3.x, n3.y, n3.z)
        }
    }

    return [vertexList, normalsList];
}

function CalcAnalyticNormal(u, v, xyz)
{
    let DeltaU = 0.0001;
    let DeltaV = 0.0001;
    let uTangent = CalcDerivativeU(u, v, DeltaU, xyz)
    vec3Normalize(uTangent);
    let vTangent = CalcDerivativeV(u, v, DeltaV, xyz);
    vec3Normalize(vTangent);
    return vec3Cross(vTangent, uTangent);
}

function vec3Normalize(a) {
    var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a[0] /= mag; a[1] /= mag; a[2] /= mag;
}
function vec3Cross(a, b) {
    let x = a[1] * b[2] - b[1] * a[2];
    let y = a[2] * b[0] - b[2] * a[0];
    let z = a[0] * b[1] - b[0] * a[1];
    return { x: x, y: y, z: z }
}

function vec3Normalize(a) {
    var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a[0] /= mag; a[1] /= mag; a[2] /= mag;
}

function CalcDerivativeU(u, v, DeltaU, xyz) {
    let Dxyz = CalculateCorrugatedSpherePoint(u + DeltaU, v);

    let Dxdu = (Dxyz.x - xyz.x) / deg2rad(DeltaU);
    let Dydu = (Dxyz.y - xyz.y) / deg2rad(DeltaU);
    let Dzdu = (Dxyz.z - xyz.z) / deg2rad(DeltaU);

    return [Dxdu, Dydu, Dzdu];
}

function CalcDerivativeV(u, v, DeltaV, xyz) {
    let Dxyz = CalculateCorrugatedSpherePoint(u, v + DeltaV);

    let Dxdv = (Dxyz.x - xyz.x) / deg2rad(DeltaV);
    let Dydv = (Dxyz.y - xyz.y) / deg2rad(DeltaV);
    let Dzdv = (Dxyz.z - xyz.z) / deg2rad(DeltaV);

    return [Dxdv, Dydv, Dzdv];
}

function CalculateCorrugatedSpherePoint(phi, v) {
    let R = 1;
    let a = 0.24;
    let n = 6;
    let x = (R * Math.cos(v) - a * (1 - Math.sin(v)) * Math.abs(Math.cos(n * phi))) * Math.cos(phi);
    let y = (R * Math.cos(v) - a * (1 - Math.sin(v)) * Math.abs(Math.cos(n * phi))) * Math.sin(phi);
    let z = R * Math.sin(v);
    return { x, y, z };
}



/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iNormalVertex = gl.getAttribLocation(prog, "normal");

    shProgram.iWorldInverseTranspose = gl.getUniformLocation(prog, "WorldInverseTranspose");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");

    shProgram.iMatAmbientColor = gl.getUniformLocation(prog, "matAmbientColor");
    shProgram.iMatDiffuseColor = gl.getUniformLocation(prog, "matDiffuseColor");
    shProgram.iMatSpecularColor = gl.getUniformLocation(prog, "matSpecularColor");
    shProgram.iMatShininess = gl.getUniformLocation(prog, "matShininess");

    shProgram.iLSAmbientColor = gl.getUniformLocation(prog, "lsAmbientColor");
    shProgram.iLSDiffuseColor = gl.getUniformLocation(prog, "lsDiffuseColor");
    shProgram.iLSSpecularColor = gl.getUniformLocation(prog, "lsSpecularColor");

    shProgram.iLightDirection = gl.getUniformLocation(prog, "LightDirection");
    shProgram.iCamWorldPosition = gl.getUniformLocation(prog, "CamWorldPosition");


    surface = new Model('Surface');
    let data = CreateSurfaceData();
    surface.BufferData(data[0], data[1]);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    canvas.onmousewheel = function (event) {
        if (+(scale - (Math.round(event.wheelDelta / 150) / 10.0)).toFixed(1) < 0.0 || +(scale - (Math.round(event.wheelDelta / 150) / 10.0)).toFixed(1) > 2.0) {
            return false;
        }
        scale -= ((event.wheelDelta / 150) / 10.0);
        document.getElementById("scale").value = +scale.toFixed(1);
        document.getElementById("scale_text").innerHTML = +scale.toFixed(1);
        draw();
        return false;
    };

    draw();
}

window.addEventListener("keydown", function (event) {
    switch (event.key) {
        case "ArrowLeft":
        case "a":
        case "A":
            World_X -= 0.1;
            draw();
            break;
        case "ArrowRight":
        case "d":
        case "D":
            World_X += 0.1;
            draw();
            break;
        case "ArrowDown":
        case "s":
        case "S":
            World_Y -= 0.1;
            draw();
            break;
        case "ArrowUp":
        case "w":
        case "W":
            World_Y += 0.1;
            draw();
            break;
        case "+":
            if (Shininess < 10) {
                Shininess += 1;
            }
            draw();
            document.getElementById("Shininess").value = Shininess;
            document.getElementById("Shininess_text").innerHTML = Shininess;
            break;
        case "-":
            if (Shininess > -10) {
                Shininess -= 1;
            }
            draw();
            document.getElementById("Shininess").value = Shininess;
            document.getElementById("Shininess_text").innerHTML = Shininess;
            break;
        default:
            return;

    }
});
