import { Component, ElementRef, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataService } from '../services/data.service';
import { HttpService } from '../services/http.service';
import { simulationDocument } from '../services/simulations.service';
import { UsersService } from '../services/users.service';
import { ResizeObserver } from 'resize-observer';

export interface setupVariableItem {
  id: number | string; iv: boolean; display: string; value: number;
}

export interface simParamArray {
  id: number; name: string; unit: string; desc?: string, style?: string,
  iv: boolean, dv: boolean, control?: boolean, dataCollectionAppropriate: boolean; visible: boolean;
  modify: Function; get: Function;  displayModifier: number;dp: number;
  default: number; min: number; max: number; divisions: number;
  controlType: string; fineControl: {available: boolean, value: number}
}

@Component({
    template: ''
})

export abstract class SimCommon implements OnInit {

    // CTX and timing abstractions
    abstract ctx: CanvasRenderingContext2D; requestId; abstract canvas: ElementRef<HTMLCanvasElement>;
    abstract startTime; abstract elapsed; abstract elapsedSinceFrame;
    abstract paused: boolean; abstract animationStarted: boolean; abstract animationEnded: boolean;

    // directory abstractions
    abstract assetsDirectory: string; abstract fullpath: string; abstract componentId: string;

    // simulation data collection setup
    abstract parametersDisplayed: object;

    // simulation parameters
    abstract simulationParameters;
    abstract simulationDocuments: simulationDocument[];

    // http and login variables
    error: string;
    errorThrown: boolean = false; submissionQuantity: number = 0; loggedIn: boolean = false;
    resultsToAdd: boolean = false; lastUpdatedRecently: boolean = false;

    // setup mode
    setupMode: boolean = false; setupVariableList: Array<setupVariableItem> = [];
    simulationSetup: UntypedFormGroup; notice_minmax: boolean = false; customUrl: string;
    simulationControls: UntypedFormGroup;

    // data collection module information
    abstract simulationId: string;
    dataCollectionMode: boolean = false; dataCollectionDefined: boolean = false; dataCollectionEnabled: boolean = false;
    dataCollectionId: number; variablesIV: number; variablesDV: number;

    // defined functions
    abstract onCanvasResize(): void;
    abstract frame(): void;
    abstract animate(): void;
    abstract resetQuestion(): void;
    abstract commonSimulationFunctionality(): void;

    constructor(protected usersService: UsersService, protected dataService: DataService,  protected route: ActivatedRoute, protected httpService: HttpService)  {
      this.route.data.subscribe(data => {
        console.log(data);
      })
    }

    ngOnInit(): void {
        this.simulationId = 'Motion Ramp';
        this.startTime; this.elapsed = 0; this.elapsedSinceFrame = 0;
        this.paused = false; this.animationStarted = false; this.animationEnded = false;
    }

    subscriptions: Subscription = new Subscription();
    resizeObserver: ResizeObserver;
    resizeElement: HTMLElement;

    observeSimulationSizeChange(callback?: Function): void {
        try {
            this.resizeElement =  document.getElementById('simulation');

            this.resizeObserver = new ResizeObserver(() => {
                this.canvas.nativeElement.width = this.resizeElement.offsetWidth;
                this.canvas.nativeElement.height = this.resizeElement.offsetHeight;

                if(this.resizeElement.offsetHeight > window.innerHeight) {
                    this.canvas.nativeElement.height = window.innerHeight;
                }

                this.onCanvasResize(); // needs changing for this as it relaunches the values.
            });

            this.resizeObserver.observe(this.resizeElement);
            callback();
        }
        catch (error) {
            console.log("Size change algorithm corrupted - simulation will be small. Reload required.")
        }
    }
    setControls() {
        this.simulationControls = new UntypedFormGroup({});
        this.simulationSetup = new UntypedFormGroup({});

        // for on initialisation
        this.simulationParameters.forEach(simParam => {
            if(simParam.iv === true || simParam.control === true) {
                if(simParam.controlType === 'range') {
                    this.simulationControls.addControl(simParam.id.toString()+"range", new UntypedFormControl(null, [Validators.required]));
                    this.simulationControls.get(simParam.id.toString()+"range").patchValue(simParam.get() * simParam.displayModifier);

                    this.subscriptions.add(this.simulationControls.get(simParam.id.toString()+"range").valueChanges.subscribe(newVal => {
                        this.simulationControlsParameterModification(simParam.id);
                    }));
                }
                if(simParam.fineControl.available === true) {
                    var text = simParam.fineControl.value;
                    this.simulationControls.addControl(simParam.id.toString()+"finer", new UntypedFormControl("+ " + text));
                    this.simulationControls.addControl(simParam.id.toString()+"finel", new UntypedFormControl("- " + text));
                }
            }
        });

        this.simulationParameters.forEach(parameter => {
            this.simulationSetup.addControl(parameter.id.toString() + "checkbox", new UntypedFormControl(null, [Validators.required]));
            if(parameter.iv === true) {
                this.simulationSetup.addControl(parameter.id.toString() + "value", new UntypedFormControl(parameter.get(), [Validators.required]));
            }
        });
        this.simulationParameters.forEach(param => {
            this.setupVariableList.push({id: param.id, iv: param.iv, display: 'f', value: param.get()});
        });

        this.setupVariableList.push({id: 'ds', iv: null, display: 't', value: null});
        this.setupVariableList.push({id: 'lb', iv: null, display: 't', value: null});
        this.setupVariableList.push({id: 'if', iv: null, display: 't', value: null});
    }

    simulationControlsParameterModification(id: number, quantity?: number) {
      var newValue = 0;
      if(quantity) {
          newValue = this.simulationParameters[id].get() + quantity * this.simulationParameters[id].displayModifier;
      } else {
          newValue = this.simulationControls.value[id+"range"] * this.simulationParameters[id].displayModifier;
      }
      this.simulationParameterModification(id, newValue);
    }

    simulationParameterModification(id: number, value: number) {
        if(value > this.simulationParameters[id].max) {
            this.simulationParameters[id].modify(+this.simulationParameters[id].max);
        } else if (value < this.simulationParameters[id].min) {
            this.simulationParameters[id].modify(+this.simulationParameters[id].min);
        } else {
            this.simulationParameters[id].modify(+value);
        }
    }

    toggleDataCollection() {
        this.dataCollectionMode = !this.dataCollectionMode;
        if(this.dataCollectionMode === true) {
            this.dataCollectionServiceLaunch();
        }
    }

    dataCollectionServiceLaunch() {
        if(this.dataCollectionMode === true) {

            if(this.variablesDV !== undefined && this.variablesIV !== undefined) {
                this.dataCollectionDefined = true;

                var controlledVariables = [];
                this.simulationParameters.forEach(param => {
                    if(param.id !== this.variablesIV) {
                        controlledVariables.push({name: param.name + " " + param.unit, value: param.get()});
                    }
                })
                this.dataCollectionId = this.dataService.addNewDataStore(this.simulationId, {name: this.simulationParameters[this.variablesIV].name, unit: this.simulationParameters[this.variablesIV].unit }, { name: this.simulationParameters[this.variablesDV].name, unit: this.simulationParameters[this.variablesIV].unit }, controlledVariables);
            } else {
                this.dataCollectionDefined = false;
            }
        }
    }

    dataCollection() {
        this.dataService.collectData(this.dataCollectionId, this.simulationParameters[this.variablesIV].get(), this.simulationParameters[this.variablesDV].get());
        this.dataCollectionEnabled = false;
    }

    setIDVariable(id: number) {
        const parameter = this.simulationParameters.filter(param => param.id === +id && param.dataCollectionAppropriate === true);
        if(parameter.length === 1) {
            if(parameter[0].iv === true) {
                this.variablesIV = +id;
            } else if(parameter[0].dv === true) {
                this.variablesDV = +id;
            }
            this.dataCollectionServiceLaunch();
        } else {
            console.log("not an option for us");
        }
    }

    setDefaultValues() {
        for(var i = 0; i < this.simulationParameters.length; i++) {
            if(this.simulationParameters[i].modify !== null) {
                this.simulationParameters[i].modify(+this.simulationParameters[i].default);
            }
        }
    }

    setQueryParameters() {
        this.simulationParameters.forEach(param => {
            this.parametersDisplayed = {...this.parametersDisplayed, [param.id]: true};
            if(this.route.snapshot.queryParams[param.id.toString()] !== undefined) {
                var paraArray = this.route.snapshot.queryParams[param.id.toString()].split("!");
                for(var v = 0; v < paraArray.length; v++) {
                    if(!isNaN(paraArray[v])) {
                        if(this.simulationParameters[param.id].iv === true) {
                            this.simulationParameterModification(param.id, paraArray[v]); // only IVs can be set
                        }
                    } else {
                        this.parametersDisplayed[param.id] = (paraArray[v] == 't');
                    }
                }
            }
        })
        this.parametersDisplayed = {...this.parametersDisplayed, 'ds': true};
        this.parametersDisplayed = {...this.parametersDisplayed, 'lb': true};
        this.parametersDisplayed = {...this.parametersDisplayed, 'if': false};

        if(this.route.snapshot.queryParams['ds'] !== undefined) {
            this.parametersDisplayed['ds'] = (this.route.snapshot.queryParams['ds'] === 't');
        }
        if(this.route.snapshot.queryParams['lb'] !== undefined) {
            this.parametersDisplayed['lb'] = (this.route.snapshot.queryParams['lb'] === 't');
        }
        if(this.route.snapshot.queryParams['if'] !== undefined) {
            this.parametersDisplayed['if'] = (this.route.snapshot.queryParams['if'] === 't');
        }
    }

    visibilityVariable(variableID: number) {
        this.simulationParameters[variableID].visible = true;
    }

    unVisibilityVariable(variableID: number) {
        this.simulationParameters[variableID].visible = false;
    }

    toggleIVVisibility(variableID: number) {
       if(this.simulationParameters[variableID].visible === true) {
         this.simulationParameters[variableID].visible = false;
       } else {
         this.simulationParameters[variableID].visible = true;
       }
    }

    getSimulationParameterIDFromName(name: string): number {
      for(var i = 0; i < this.simulationParameters.length; i++) {
         if(this.simulationParameters[i].name === name) {
            return i;
         }
      }
      return null;
   }

   getAppropriateTimeFormat(parameterName: string, seconds: number): number {
      var paramId: number = this.getSimulationParameterIDFromName(parameterName);
        if(seconds < 0.000000001) {
           this.simulationParameters[paramId].unit = "ns"; return seconds * 1000000000;
        } else if(seconds < 0.000001) {
           this.simulationParameters[paramId].unit = "micro s"; return seconds * 1000000;
        } else if(seconds < 0.001) {
           this.simulationParameters[paramId].unit = "ms"; return seconds * 1000;
        } else if(seconds < 60) {
           this.simulationParameters[paramId].unit = "s"; return seconds * 1;
        } else if(seconds < 3600) {
           this.simulationParameters[paramId].unit = "m"; return seconds / 60;
        } else if(seconds < 86400) {
           this.simulationParameters[paramId].unit = "h"; return seconds / 3600;
        } else if(seconds < 31536000) {
           this.simulationParameters[paramId].unit = "d"; return seconds / 86400;
        } else if(seconds < 3153600000) {
           this.simulationParameters[paramId].unit = "y"; return seconds / 31536000;
        } else if(seconds < 315360000000) {
           this.simulationParameters[paramId].unit = "cy"; return seconds / 3153600000;
        } else if(seconds < 3153600000000) {
         this.simulationParameters[paramId].unit = "ky"; return seconds / 31536000000;
        } else {
           this.simulationParameters[paramId].unit = "My"; return seconds / 315360000000000;
        }
   }

    enableSetupMode() {
        this.setupMode = !this.setupMode;
    }

    setupVariableCheckboxChange(id: number) {
        this.setupVariableList[id].display = this.simulationSetup.value[id+"checkbox"];
        this.generateCustomUrl();
    }

    setupVariableValueChange(id: number) {
        var newVal = this.simulationSetup.value[id+"value"];

        if(newVal > this.simulationParameters[id].max) {
            newVal = this.simulationParameters[id].max;
            this.notice_minmax = true;
        } else if(newVal < this.simulationParameters[id].min) {
            newVal = this.simulationParameters[id].min;
            this.notice_minmax = true;
        }

        this.setupVariableList[id].value = newVal;
        this.simulationSetup.controls[id+"value"].setValue(newVal);
        this.generateCustomUrl();
    }

    toggleSpecialButton(index: number) {
       let indx: number = this.setupVariableList.length - index;
       if(this.setupVariableList[indx].display === 'f') {
            this.setupVariableList[indx].display = 't';
       } else {
            this.setupVariableList[indx].display = 'f';
       }
       this.generateCustomUrl();
    }

    generateCustomUrl() {
        let parameterUrl: string = location.protocol + '//' + location.host + location.pathname + this.fullpath;
        let parameters: string = "?";

        if(this.setupVariableList[this.setupVariableList.length - 1].display === 't') {
          parameterUrl = parameterUrl.replace(/\bsimulations\b/g, 'iframe');
        }

        this.setupVariableList.forEach((param, index) => {
            parameters += param.id + "=" + param.display.toString().slice(0,1);

            if(param.iv === true) {
                parameters += "!" + param.value;
            }
            if(this.setupVariableList.length-1 > index) {
               parameters += "&";
            }
        });
        this.customUrl = parameterUrl + parameters;
    }

    canvas_arrow(context, fromx, fromy, tox, toy) {
        this.ctx.beginPath();
        var headlen = 10; // length of head in pixels
        var dx = tox - fromx;
        var dy = toy - fromy;
        var angle = Math.atan2(dy, dx);
        context.moveTo(fromx, fromy);
        context.lineTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        context.moveTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    rotatedText(context, text, angle, translateX, translateY, positionX, positionY) {
        context.translate(translateX, translateY);
        context.rotate(angle);
        context.fillText(text, positionX, positionY);
        context.rotate(-angle);
        context.translate(-translateX, -translateY);
    }

    startAnimation() {
        if(this.animationStarted === false) {
            this.animationStarted = true;
            this.animate();
        }
    }

    stopAnimation() {
        if(this.paused) {
            this.paused = false;
        } else {
            this.paused = true;
        }
    }
}
