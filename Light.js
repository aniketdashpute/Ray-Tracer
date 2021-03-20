/*******************************************************************
 * @file: Light.js
 * @author: Aniket Dashpute
 * @description: Lights file with Phong shading parameters
 * Northwestern University
*******************************************************************/

function CLight(lightPos)
{
    // light position
    this.position = vec4.create();
    vec4.copy(this.position, lightPos);
    
    // light color
    this.color = vec4.fromValues(0.8, 0.8, 0.8, 1.0);
    
    // light power
    this.power = 40.0;

    console.log("Light position: "+this.position);
}

CLight.prototype.setPower = function(nPower)
{
    this.power = nPower;
}

CLight.prototype.setPosition = function(lightPos)
{
    vec4.copy(this.position, lightPos);
}

CLight.prototype.setColor = function(color)
{
    vec4.copy(this.color, color);
}