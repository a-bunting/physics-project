import { EventEmitter, Injectable } from '@angular/core';

export interface menuCategory {
   title: string; route: string; items: menuItem[];
}

export interface menuItem {
   name: string;
   version: string; tags: string[]; description: string; video?: string;
   route: string; parameters: Object; background: string; subItems: subMenuItem[];
}

export interface subMenuItem {
   name: string; parameters: string;
}

@Injectable({
  providedIn: 'root'
})
export class DirectoryService {

    menuEmitter: EventEmitter<menuCategory[]> = new EventEmitter<menuCategory[]>();

    constructor() { }

    tagStyles =
    [
        { name: 'IB', classes: 'ib' },
        { name: 'AP', classes: 'ap' },
        { name: 'HS', classes: 'hs' },
        { name: 'Simulation', classes: 'simulation' }
    ]

  questionsGeneratorItems: menuCategory =
   {  title: 'Question Generators',
      route: '/questions-generator',
      items:  [
                  {
                        name: "Projectile Motion", version: "1.0", tags: ["IB", "AP", "Question"],
                        description: "Practice your projectile motion here, with a variety of beginner to expert questions!",
                        route: "/questions-generator/projectile-motion", parameters: null, background: 'projectile.jpg',
                        subItems: [
                           {name: "Questions!", parameters: ""}
                        ]
                  },
                  {
                        name: "Speed Distance Time", version: "1.0", tags: ["IB", "AP", "HS", "Question"],
                        description: "Practice simple use of the speed, distance, time equation in this questions module.",
                        route: "/questions-generator/speed-distance-time", parameters: null, background: 'speeddistancetime.JPG',
                        subItems: [
                           {name: "Questions!", parameters: ""}
                        ]
                     },
                  {
                        name: "Ideal Gasses", version: "1.0", tags: ["IB", "AP", "Question"],
                        description: "Ideal gas problems can be complex, especially when including energy. A range of tough questions in this module.",
                        route: "/questions-generator/ideal-gasses", parameters: null, background: 'idealgasses.JPG',
                        subItems: [
                           {name: "Questions!", parameters: ""}
                        ]
                  },
                  {
                    name: "Meteor Problem", version: "0.5", tags: ["IB", "AP", "HS", "problem", "motion", "basics"],
                    description: "A meteor collides with the Earth! Oh nnoooooo!.",
                    route: "/problems/friction-and-motion", parameters: null, background: "meteor.JPG",
                    subItems: [
                       {name: "Fully Enabled", parameters: ""}
                    ]
                 }
               ]
      }

      practiceItems: menuCategory = {
          title: 'Etc...',
          route: '/',
          items: [
            {
              name: "Mazes and Pathfinding", version: "0.1", tags: ["Mazes"],
              description: "Making Mazes!",
              route: "/mazes", parameters: null, background: "mazes.jpg",
              subItems: [
                 {name: "Fully Enabled", parameters: ""}
              ]
           },
           {
              name: "AI Cars",  version: "0.01 PrePreAlpha", tags: ["Fun"],
              description: "Car simulator y'all!.",
              route: "/cars/", parameters: null, background: "cars.JPG",
              subItems: [
                 {name: "Fully Enabled", parameters: ""}
              ]
           },
           {
              name: "Data Generator",  version: "1", tags: ["Fun", "Data"],
              description: "Its a data generator, for generating data!",
              route: "/datagen/", parameters: null, background: "datagen.JPG",
              subItems: [
                 {name: "Fully Enabled", parameters: ""}
              ]
           }
          ]
      }

   simulationsItems: menuCategory =
      {  title: 'Simulations',
         route: '/simulations',
         items:   [
                     {
                        name: "Motion Ramp", version: "1.1", tags: ["IB", "AP", "HS", "Simulation"],
                        description: "The motion ramp simulates the gravitational, frictional and applies forces acting on a block sliding down a ramp.",
                        route: "/simulations/motion-ramp", parameters: null, background: "motion-ramp.jpg", video: 'ramp.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""},
                           {name: "Frictionless", parameters: "0=t!1&1=t!-30&2=t!2&3=t!9.81&4=t!10&5=f!0&6=f!0&7=f!0&8=t&9=t&10=f&11=f&ds=t"},
                           {name: "Friction Sim", parameters: "0=t!1&1=t!-30&2=t!2&3=t!9.81&4=t!10&5=t!0&6=t!1&7=f!0&8=t&9=t&10=t&11=f&ds=t"}
                        ]
                     },
                     {
                        name: "Freefall",  version: "1.0", tags: ["IB", "AP", "HS", "Simulation"],
                        description: "Freefall on Earth or in the lab, this simulation will help you measure anything that affects the free fall of an object.",
                        route: "/simulations/freefall", parameters: null, background: "freefall.jpg", video: 'freefall.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""},
                           {name: "Basic Freefall", parameters: "0=t!1&1=t!10&2=t!9.81&3=f!2000&4=t!1&5=f!0&6=f!1&7=f!2&8=f!0&9=t&10=t&11=f&12=t&13=f&14=f&15=f&ds=t"},
                           {name: "Terminal Velocity", parameters: "0=t!1&1=t!10&2=t!9.81&3=f!2000&4=t!1&5=t!1.225&6=t!0.05&7=f!2&8=t!1.05&9=t&10=t&11=t&12=t&13=f&14=f&15=f&ds=t"},
                           {name: "Apparent Weight", parameters: "0=t!1&1=t!10&2=t!9.81&3=f!2000&4=t!1&5=t!1.225&6=f!0.05&7=f!2&8=f!1.05&9=t&10=t&11=t&12=f&13=t&14=f&15=f&ds=t"}
                        ]
                     },
                     {
                        name: "Electric Fields",  version: "1.0", tags: ["IB", "AP", "HS", "Simulation"],
                        description: "The simulation shows what electron charge fields look like as they whizz around one another. No coulomb force!",
                        route: "/simulations/electromagnetic-fields", parameters: null, background: "electromagnetism.jpg", video: 'electromagnetism.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     },
                     {
                        name: "Forces", version: "1.2", tags: ["IB", "AP", "HS", "Simulation"],
                        description: "A full and complex forces simulator. Weight, Buoyancy, Applied Forces and Drag all apply here.",
                        route: "/simulations/forces-basic/", parameters: null, background: "forces.jpg",  video: 'forces.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""},
                           {name: "No Air Mode", parameters: "?0=t!1&1=t!10&2=t!4&3=t!9.81&4=f!0&5=f!90&6=t!2000&7=t!1&8=f!1.225&9=f!0.05&10=f!1&11=f!1.05&12=f&13=t&14=t&15=f&16=t&17=t&18=t&19=f&20=f&21=f&22=t&23=t&24=t&25=t&ds=t"},
                           {name: "Weight and Gravity", parameters: "?0=t!1&1=t!10&2=t!4&3=t!9.81&4=f!0&5=f!90&6=f!2000&7=t!1&8=f!1.225&9=f!0.05&10=f!1&11=f!1.05&12=t&13=f&14=t&15=f&16=t&17=f&18=t&19=t&20=f&21=f&22=f&23=t&24=f&25=t&ds=t"},
                           {name: "Sliding on a flat", parameters: "?0=t!1&1=t!10&2=t!4&3=f!0&4=f!0&5=f!90&6=f!20000&7=t!1&8=f!0&9=f!0.05&10=f!1&11=f!1.05&12=t&13=t&14=t&15=f&16=t&17=t&18=f&19=f&20=f&21=f&22=t&23=t&24=t&25=t&ds=t"},
                           {name: "Basic Projectiles", parameters: "?0=t!1&1=t!10&2=t!4&3=t!9.81&4=t!20&5=t!260&6=f!1&7=t!1&8=f!0&9=f!0.05&10=f!1&11=f!1.05&12=t&13=t&14=t&15=f&16=t&17=t&18=t&19=f&20=f&21=f&22=f&23=f&24=t&25=t&ds=t"},
                           {name: "Complex Projectiles", parameters: "?0=t!1&1=t!10&2=t!4&3=t!9.81&4=t!20&5=t!260&6=f!1&7=t!1&8=t!1.225&9=t!0.05&10=t!1&11=t!1.05&12=t&13=t&14=t&15=t&16=t&17=t&18=t&19=f&20=t&21=f&22=t&23=t&24=t&25=t&ds=t"}
                        ]
                     },
                     {
                        name: "Kinematics",  version: "1.0", tags: ["IB", "AP", "HS", "Simulation"],
                        description: "The energy of a moving object. Draw a track and see how the motion of the ball varies as it rounds your track.",
                        route: "/simulations/kinematics/", parameters: null, background: null, video: 'kinematics-video.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     },
                     {
                        name: "Half Life",  version: "0.95 Beta", tags: ["IB", "AP", "Simulation"],
                        description: "A simulation of the half life and main decay chains of all the isotopes known to humankind.",
                        route: "/simulations/halflife/", parameters: null,  background: null, video: 'nuclear.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     },
                     {
                        name: "Momentum",  version: "1.0", tags: ["HS", "IB", "AP", "Simulation", "Momentum"],
                        description: "A simple simulation of the momentum of a collision, with some optional extra frictional forces too!",
                        route: "/simulations/momentum/", parameters: null, background: "momentum.jpg", video: 'momentum.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     },
                     {
                        name: "Circular Motion (Alpha)",  version: "0.1 PreAlpha", tags: ["IB", "AP", "Simulation", "Momentum"],
                        description: "An object spinning around a fixed point from a variablly elastic rope is the focus of this simulation.",
                        route: "/simulations/circular-motion/", parameters: null, background: "", video: 'ramp.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     },
                     {
                        name: "Gravity (Alpha)",  version: "0.3 Alpha", tags: ["IB", "AP", "HS", "Simulation", "Momentum"],
                        description: "Gravity, the force we all know and love. This simulation allows you to see what happens between objects of mass due to gravity.",
                        route: "/simulations/gravity/", parameters: null, background: "", video: 'ramp.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     },
                     {
                        name: "Heat (Pre-Alpha)",  version: "0.01 PreAlpha", tags: ["IB", "AP", "HS", "Simulation", "Momentum", "Chemistry"],
                        description: "Heat, the movement of thermal energy. Use this simulation to build thermal situations and see how energy moves between objects.",
                        route: "/simulations/heat-transfer/", parameters: null, background: "", video: 'ramp.mp4',
                        subItems: [
                           {name: "Fully Enabled", parameters: ""}
                        ]
                     }
                  ]
      }

   getAllQuestions(): menuCategory {
      return this.questionsGeneratorItems;
   }

   getAllSimulations(): menuCategory {
      return this.simulationsItems;
   }

   getAllProblems(): menuCategory {
      return this.practiceItems;
   }

   getQuestionsByTag(tag: string): menuItem[]  {
      return this.questionsGeneratorItems.items.filter(obj => {
          return this.search(obj, tag);
        });
    }

   getSimulationsByTag(tag: string): menuItem[]  {
      return this.simulationsItems.items.filter(obj => {
         return this.search(obj, tag);
      });
   }

   getProblemsByTag(tag: string): menuItem[]  {
      return this.practiceItems.items.filter(obj => {
         return this.search(obj, tag);
      });
   }

    search(obj: menuItem, searchTag: string): boolean {
        // var regEx = RegExp('\\b' + searchTag.toLowerCase() , 'i');
        var regEx = RegExp('[a-zA-Z]*?(' + searchTag.toLowerCase() + ')+[a-zA-Z]*?', 'i');
        for(var i = 0; i < obj.tags.length; i++) {
            if(obj.tags[i].toLowerCase().search(regEx) !== -1 || obj.name.toLowerCase().search(regEx) !== -1) {
                return true;
            }
        }
        return false;
    }

   searchAllMenuItems(tags: string): menuCategory {
        var words: string[] = tags.split(' ');
        var returnItems: menuCategory = { title: "", route: "", items: []};
        var items: menuItem[] = []

        words.forEach(tag => items = items.concat(this.getQuestionsByTag(tag)));
        words.forEach(tag => items = items.concat(this.getSimulationsByTag(tag)));
        words.forEach(tag => items = items.concat(this.getProblemsByTag(tag)));

        returnItems.title = tags;
        returnItems.items = items;

        return returnItems;
   }

   getTagStyles(tagName: string): string {
       for(var o = 0; o < this.tagStyles.length; o++) {
           if(this.tagStyles[o].name === tagName) {
               return this.tagStyles[o].classes;
           }
       }
       return "default";
   }

    parameterDecoder(params: string): object {
        if(params !== "") {
            var parameterArray = params.split("&");
            var newObj = "{";
            parameterArray.forEach(key => {
                var param = key.split("=");
                var obj = "\"" + param[0] + "\" : \"" + param[1] + "\", ";
                newObj = newObj + obj;
            });
            newObj = newObj.substring(0, newObj.length - 2) + "}";
            // console.log(JSON.parse(newObj));
            return JSON.parse(newObj);
        }
        return null;
    }

    simulationMenuChange(simName: string): void {

        let menuList: menuCategory[] = [];
        menuList.push(this.getAllQuestions());
        menuList.push(this.getAllProblems());
        menuList.push(this.getAllSimulations());

        try {
            this.simulationsItems.items.forEach((sim: menuItem) => {
                if(sim.name === simName) {
                    // this is the menu, need to make a new menuCategory with the subitems.
                    let newMenuCategory: menuCategory;
                    newMenuCategory = {
                        title: sim.name,
                        route: sim.route,
                        items: []
                    };

                    sim.subItems.forEach((subitem: subMenuItem) => {
                        let menuItem: menuItem = {
                            name: subitem.name,
                            version: sim.version,
                            tags: sim.tags,
                            description: sim.description,
                            route: sim.route,
                            parameters: this.parameterDecoder(subitem.parameters),
                            background: sim.background,
                            subItems: []
                        }

                        newMenuCategory.items.push(menuItem);
                    });

                    menuList.push(newMenuCategory);
                    this.menuEmitter.emit(menuList);
                }
            });
        } catch(error) {
            // no submenu appears...
        }
    }

}
