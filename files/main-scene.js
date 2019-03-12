
// Variables for Camera
var tracking = false;
var camera_once = false;

// Returns position vector from Mat4
function retVector(model_transform) {
    return Vec.of(model_transform[0][3], model_transform[1][3], model_transform[2][3]);
}




/* MOVEMENT */

var setup_first_once_m_fish = false;
let m_origin = Mat4.identity();
var m_fish = m_origin.times(Mat4.translation(Vec.of(0, start_height, 0)));

// bezier curve movement values
var m_old_pos = m_origin;
var m_goal_pos = m_origin;
var goal_direction = Vec.of(1, 0, 0);
var move_start_time = 0;
var pos_in_curve = 0;

// state bools
var fish_idle = false;
var fish_moving = true;
var food_found = false;

// instantaneous bools
var fish_start_moving = false;

// speed values
var drop_speed = 0.01;
var swim_speed = 1/1.2;
var paddle_speed = 15;
const low_speed = 5;
const med_speed = 25;
const high_speed = 30;


// position values
var fish_size = 0.5;
var start_height = 0;








/* MOUSE CLICK */

var trackobject = 0;
var object_x_WCS = []; //default with origin
var object_y_WCS = []; //default with origin
var object_z_WCS = [];

function onclick(screen_x, screen_y){
//     trackobject++;
//     console.log(screen_x);
// //     x = Math.random() * 8;
// //     y = Math.random() * 8;
//     z = 0;
//     object_x_WCS.push(screen_x/15);
//     object_y_WCS.push(screen_y/-15);
//     object_z_WCS.push(z);
}





/* MAIN SCENE */

class Fish_Are_Friends extends Scene_Component {
    // The scene begins by requesting the camera, shapes, and materials it will need.
    constructor(context, control_box) {
        super(context, control_box);

        // First, include a secondary Scene that provides movement controls:
        if(!context.globals.has_controls)
            context.register_scene_component(new Movement_Controls(context, control_box.parentElement.insertCell()));

        // Locate the camera here (inverted matrix).
        const r = context.width / context.height;
        context.globals.graphics_state.camera_transform = Mat4.translation([0, 0, -35]);
        context.globals.graphics_state.projection_transform = Mat4.perspective(Math.PI / 4, r, .1, 1000);

        this.trans = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape
        // design.  Once you've told the GPU what the design of a cube is,
        // it would be redundant to tell it again.  You should just re-use
        // the one called "box" more than once in display() to draw
        // multiple cubes.  Don't define more than one blueprint for the
        // same thing here.
        const shapes = {
            'square': new Square(),
            'circle': new Circle(15),
            'pyramid': new Tetrahedron(false),
            'simplebox': new SimpleCube(),
            'box': new Cube(),
            'cylinder': new Cylinder(15),
            'cone': new Cone(20),
            'ball': new Subdivision_Sphere(4),

            'body': new Body(),
            'end1': new End1(),
            'end2': new End2(),
            'end3': new End3(),
            'tail': new Tail(),
            'eyes': new Eye()
        }
        this.submit_shapes(context, shapes);
        this.shape_count = Object.keys(shapes).length;
        
        //this.MeshBasicMaterial( { side:THREE.BackSide,map:texture, depthWrite: false, depthTest: false });

        /* PROVIDED TEXTURES */

        // Make some Material objects available to you:
        this.test = context.get_instance(Phong_Shader).material(Color.of(.9, .5, .9, 1), {
            ambient: 0.4,       //how might light goes through it
            diffusivity: .4,    //brightness facing light i think
            //specularity: 0    // l -> r gradient
        });

		this.clay = context.get_instance(Phong_Shader2).material(Color.of(.2, .5, .1, 1), {
            ambient: .4,
            diffusivity: .4,
            depthTest: false
        });
        
        this.plastic = this.clay.override({
            specularity: .6
        });

        this.texture_base = context.get_instance(Phong_Shader).material(Color.of(0, 0, 0, 1), {
            ambient: 1,
            diffusivity: 0.4,
            specularity: 0.3
        });

        /* TEXTURES */
        
        this.shape_materials = {};
        const shape_textures = {

            // TABLE
            table: "assets/table.png",
            
            // FISH
            scales: "assets/scales/scales.jpg",
            body: "assets/scales/scales_body.jpg",
            end: "assets/scales/scales_end.jpg",
            tail: "assets/scales/scales_tail.jpg",
            eyes: "assets/eyes/eyes.png",

            // FISHFOOD
            fishfood:  "assets/fishfood.png"
        };
        for (let t in shape_textures)
            this.shape_materials[t] = this.texture_base.override({
                texture: context.get_instance(shape_textures[t])
            });

        // COLORS
        this.red = Color.of(1, 0, 0, 1);
        this.yellow = Color.of(1, 1, 0, 1);
        this.blue = Color.of(0, 0, 1, 1);
        this.green = Color.of(0, 1, 0, 1);
        this.aqua = Color.of(0.2, 0.8, 1, 1);
        this.leaf = Color.of(0.55, 0.8, 0, 1);
        this.dark_leaf = Color.of(0.22, 0.4, 0, 1);
        this.brown = Color.of(0.3, 0.3, 0.3, 1);
        this.orange = Color.of(1, 0.5, 0, 1);

        /* OTHER */

        // LIGHT
        this.lights = [new Light(Vec.of(10, 10, 20, 1), Color.of(1, .4, 1, 1), 100000)];

        // TIME
        this.t = 0;
    }





    /* UNDER THE HOOD */

    // lookAtMatrix
    cameratrack(graphics_state, model_transform) {
        var object = retVector(model_transform);
        var position = object.plus(Vec.of(0, 0, fish_size*15));

        graphics_state.camera_transform = Mat4.look_at(position, object, Vec.of(0, 1, 0));
    }

    // Default position of camera
    cameraorigin(graphics_state) {
        var object = Vec.of(0, 0, 0);
        var position = Vec.of(0, 0, 35);

        graphics_state.camera_transform = Mat4.look_at(position, object, Vec.of(0, 1, 0));
        camera_once = false;
    }

    // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
    make_control_panel() {
        this.key_triggered_button("Pause Time", ["n"], () => {
            this.paused = !this.paused;
        });

        this.key_triggered_button("Follow Fish", ["q"], () => {
            if (!camera_once && tracking) {
                camera_once = true;
            }
            tracking = !tracking;
        });
    }

    // Mouse click
    detectLeftButton(evt) {
        evt = evt || window.event;
        if ("buttons" in evt) {
            return evt.buttons == 1;
        }
        var button = evt.which || evt.button;
        return button == 1;
    }




    
    /* DISPLAY */

    display(graphics_state) {
        // Use the lights stored in this.lights.
        graphics_state.lights = this.lights;
                
        // Find how much time has passed in seconds, and use that to place shapes.
        if (!this.paused)
            this.t += graphics_state.animation_delta_time / 1000;
        const t = this.t;
        
        
        
        // TABLE
        
        const table_height = 3;
        const table_width = 9;
        const table_length = 4;
        const table_scale = 1.2;
        const table_pos = -6;
        this.table(graphics_state, m_origin, table_pos, table_height, table_width, table_length, table_scale);

        // FOOD

        this.food(graphics_state, m_origin);

        // FISH
        
        start_height = 7 + table_scale*table_pos;
        let center = m_origin.times(Mat4.translation(Vec.of(0, start_height, 0)));
        
        if (!setup_first_once_m_fish) {
            m_fish = center;
            setup_first_once_m_fish = true;
        }

        if (food_found) {
            this.food_found();
        }
        else {
            if (t % 10 < 0.1) {
                this.new_goal(center);
                fish_moving = true;
            }

            else if (fish_moving) {
                goal_direction = retVector(m_goal_pos).minus(retVector(m_old_pos));
                m_fish = this.move_movement(center, t);
            }
            else {
                this.idle_movement(t);
            }
        }        

        let m_final = this.align_direction(t);
        this.fish(graphics_state, m_final, t, fish_size, paddle_speed, false);

        // CAMERA TRACKING

        if (tracking) {
            this.cameratrack(graphics_state, m_fish);
        }
        if (camera_once)
            this.cameraorigin(graphics_state);
    }





    /* MOVEMENT */

    idle_movement(t) {
        
        m_fish = m_fish.times(Mat4.translation(Vec.of(0, -1*drop_speed, 0)));

        if (retVector(m_fish)[1] < -4) {
            if (t % 2 <= 1)
                m_fish = m_fish.times(Mat4.translation(Vec.of(0, drop_speed, 0)));
            else
                m_fish = m_fish.times(Mat4.translation(Vec.of(0, -1*drop_speed, 0)));
        }
        
        m_old_pos = m_fish;
        paddle_speed = low_speed;
    }

    move_movement(model_transform, t) {
        if (!fish_start_moving) {
            fish_start_moving = true;
            move_start_time = t;
        }

        var local_time = t - move_start_time;
        pos_in_curve = 1 - 0.5*(Math.cos(local_time*swim_speed) + 1);
        var m_midpoint = this.calculate_mid(m_old_pos, m_goal_pos);

        var P0 = retVector(m_old_pos);
        var P1 = retVector(m_midpoint);
        var P2 = retVector(m_goal_pos);

        let A_pos = P0.times(1-pos_in_curve).plus(P1.times(pos_in_curve));
        let B_pos = P1.times(1-pos_in_curve).plus(P2.times(pos_in_curve));

        let next_pos = A_pos.times(1-pos_in_curve).plus(B_pos.times(pos_in_curve));

        if (pos_in_curve >= 0.95) {
            fish_moving = false;
            fish_start_moving = false;
            m_old_pos = m_goal_pos;
        }

        return model_transform.times(Mat4.translation(next_pos));
    }

    new_goal(model_transform) {
        var new_x = (Math.random() - 0.5) * 9.5;
        var new_y = (Math.random() - 0.5) * 6.5;
        var new_z = (Math.random() - 0.5) * 4.5;

        m_goal_pos = model_transform.times(Mat4.translation(Vec.of(new_x, new_y, new_z)));
        paddle_speed = med_speed;
    }

    calculate_mid() {
        let vec_p = retVector(m_old_pos);
        let vec_n = retVector(m_goal_pos);

        return m_origin.times(Mat4.translation(Vec.of(vec_p[0], vec_n[1], vec_p[2])));
    }

    align_direction(t) {
        var local_time = t - move_start_time;
        let deg_direction = 0;
        let deg_direction2 = 0.5 * Math.PI/2 * (1 - pos_in_curve);

        if (goal_direction[0] > 0) {
            deg_direction = Math.atan(-goal_direction[2]/goal_direction[0]);
        }
        else if (goal_direction[0] == 0) {
            deg_direction = 0;
        }
        else {
            deg_direction = Math.PI + Math.atan(goal_direction[2]/-goal_direction[0]);
        }

        if (goal_direction[1] < 0)
            deg_direction2 = deg_direction2 * -1;

        return m_fish.times(Mat4.rotation(deg_direction, Vec.of(0, 1, 0)))
                    .times(Mat4.rotation(deg_direction2, Vec.of(0, 0, 1)));
        
    }

    facing_right() {
        return goal_direction[0] >= 0 ? true : false;
    }

    food_found() {
        // since you're interrupting normal movement behavior here,
        // make sure to update old_pos here
    }







    /* OBJECTS */

    table(graphics_state, model_transform, pos, height, width, length, scale) {

        let m = model_transform.times(Mat4.scale([scale, scale, scale]))
                                .times(Mat4.translation([0, pos, 0]));

        //legs
        this.draw_legs(graphics_state, m, 1, 1, height, width, length, scale);
        this.draw_legs(graphics_state, m, 1, -1, height, width, length, scale);
        this.draw_legs(graphics_state, m, -1, 1, height, width, length, scale);
        this.draw_legs(graphics_state, m, -1, -1, height, width, length, scale);

        //tabletop
        this.shapes['box'].draw(
            graphics_state, 
            m.times(Mat4.scale([width, 1, length])),
            this.shape_materials['table']
           // this.clay
        )
    }

    draw_legs(graphics_state, model_transform, x, y, height, width, length, scale){

         this.shapes['box'].draw(
               graphics_state,
               model_transform.times(Mat4.translation([x*(width-1.2), -height-0.2, y*(length-1.2)]))
                                .times(Mat4.scale([1, height, 1])),
               this.shape_materials['table']);
    }


    food(graphics_state, model_transform) {

        ////////////////////////draw all objects, their coordinates are stored in the global variables on the top of this file
        var i;
        for(i = 0; i < object_x_WCS.length; i++){
            let m = Mat4.translation(Vec.of(object_x_WCS[i], object_y_WCS[i], object_z_WCS[i]));
            let transformMat = Mat4.translation(Vec.of(object_x_WCS[i], object_y_WCS[i], object_z_WCS[i]));
            let WCS = transformMat.times( Vec.of(0,0,0).to4(1));
            this.shapes.ball.draw(
                graphics_state,
                transformMat.times(Mat4.translation(Vec.of(0,15,0))),
                this.shape_materials["fishfood"] || this.plastic
           );
        }
    }


    fish(graphics_state, model_transform, t, size, speed, special) {

        const deg_body = -0.05*(Math.sin(speed*t));
        const deg_tail = 0.2*(Math.sin(speed*t));
        let eye_size = 0.12;

        let m_body = model_transform.times(Mat4.rotation(Math.PI/2, Vec.of(0, 1, 0)))
                            .times(Mat4.scale(Vec.of(size, size, size)))
                            .times(Mat4.rotation(Math.PI/2 + deg_body, Vec.of(0, 1, 0)))
                            .times(Mat4.scale(Vec.of(1.4, 1, 0.8)))
                            .times(Mat4.rotation(-Math.PI/2, Vec.of(0, 1, 0)));

        let m_end1 = m_body.times(Mat4.rotation(-Math.PI/2, Vec.of(0, 0, 1)))     // To hide the texture lol
                            .times(Mat4.scale(Vec.of(1, 1, 0.45)))
                            .times(Mat4.translation(Vec.of(0, 0, -1.2)));

        let m_end2 = m_end1.times(Mat4.translation(Vec.of(0, 0, -0.935)));

        let m_end3 = m_end2.times(Mat4.rotation(Math.PI/2, Vec.of(0, 0, 1)))     // To hide the texture lol
                            .times(Mat4.translation(Vec.of(0, 0, -0.2)));

        let m_tail = m_end3.times(Mat4.translation(Vec.of(0, 0, -0.1)))
                            .times(Mat4.rotation(Math.PI/2, Vec.of(0, 1, 0)))
                            .times(Mat4.rotation(Math.PI/2, Vec.of(0, 0, 1)))
                            .times(Mat4.rotation(deg_tail, Vec.of(1, 0, 0)))
                            .times(Mat4.scale(Vec.of(1, 0.9, 1)))
                            .times(Mat4.translation(Vec.of(0, -1.2, 0)));

        let m_eye = m_body.times(Mat4.translation(Vec.of(0, 0, 0.7)))
                            .times(Mat4.rotation(-Math.PI/2, Vec.of(0, 1, 0)))
                            .times(Mat4.scale(Vec.of(1/1.4, 1, 1/0.8)))
                            .times(Mat4.translation(Vec.of(0, 0.45, 0)));
        let m_eye1 = m_eye.times(Mat4.translation(Vec.of(0, 0, 0.5)))
                            .times(Mat4.rotation(-0.55*Math.PI/2, Vec.of(0, 1, 0)))
                            .times(Mat4.scale(Vec.of(0.8*eye_size, eye_size, eye_size)));
        let m_eye2 = m_eye.times(Mat4.translation(Vec.of(0, 0, -0.5)))
                            .times(Mat4.rotation(0.55*Math.PI/2, Vec.of(0, 1, 0)))
                            .times(Mat4.scale(Vec.of(0.8*eye_size, eye_size, eye_size)));



        if (special) {
            this.shapes['body'].draw(
                   graphics_state,
                   m_body,
                   this.shape_materials["body"]);
            this.shapes['end1'].draw(
                   graphics_state,
                   m_end1,
                   this.shape_materials["end"]);
            this.shapes['end2'].draw(
                   graphics_state,
                   m_end2,
                   this.shape_materials["end"]);
            this.shapes['end3'].draw(
                   graphics_state,
                   m_end3,
                   this.shape_materials["scales"]);
            this.shapes['tail'].draw(
                   graphics_state,
                   m_tail,
                   this.shape_materials["tail"]);
            this.shapes['eyes'].draw(
                   graphics_state,
                   m_eye1,
                   this.shape_materials["eyes"]);
            this.shapes['eyes'].draw(
                   graphics_state,
                   m_eye2,
                   this.shape_materials["eyes"]);
        }
        else {
            this.shapes['body'].draw(
                   graphics_state,
                   m_body,
                   this.plastic.override({color: this.orange}));
            this.shapes['end1'].draw(
                   graphics_state,
                   m_end1,
                   this.plastic.override({color: this.orange}));
            this.shapes['end2'].draw(
                   graphics_state,
                   m_end2,
                   this.plastic.override({color: this.orange}));
            this.shapes['end3'].draw(
                   graphics_state,
                   m_end3,
                   this.plastic.override({color: this.orange}));
            this.shapes['tail'].draw(
                   graphics_state,
                   m_tail,
                   this.plastic.override({color: this.orange}));
            this.shapes['eyes'].draw(
                   graphics_state,
                   m_eye1,
                   this.shape_materials["eyes"]);
            this.shapes['eyes'].draw(
                   graphics_state,
                   m_eye2,
                   this.shape_materials["eyes"]);
        }
    }
}

window.Fish_Are_Friends = window.classes.Fish_Are_Friends = Fish_Are_Friends;
