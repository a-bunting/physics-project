import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MathjaxModule } from 'mathjax-angular';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { QuestionsGeneratorComponent } from './questions-generator/questions-generator.component';
import { SpeedDistanceTimeComponent } from './questions-generator/speed-distance-time/speed-distance-time.component';
import { GradeConversion } from './gradeconverter.pipe';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { ProjectileMotionComponent } from './questions-generator/projectile-motion/projectile-motion.component';
import { IdealGassesComponent } from './questions-generator/ideal-gasses/ideal-gasses.component';
import { DisplayAllFeedbackComponent } from './admin/display-all-feedback/display-all-feedback.component';
import { DataDisplayComponent } from './utilities/data-display/data-display.component';
import { MotionRampComponent } from './simulations/motion-ramp/motion-ramp.component';
import { SimulationsComponent } from './simulations/simulations.component';
import { FreefallComponent } from './simulations/freefall/freefall.component';
import { ElectromagneticFieldsComponent } from './simulations/electromagnetic-fields/electromagnetic-fields.component';
import { ForcesBasicComponent } from './simulations/forces-basic/forces-basic.component';
import { KinematicsComponent } from './simulations/kinematics/kinematics.component';
import { SimLabsComponent } from './educational/sim-labs/sim-labs.component';
import { HalflifeComponent } from './simulations/halflife/halflife.component';
import { MomentumComponent } from './simulations/momentum/momentum.component';
import { SearchComponent } from './utilities/search/search.component';
import { CircularMotionComponent } from './simulations/circular-motion/circular-motion.component';
import { GravityComponent } from './simulations/gravity/gravity.component';
import { HeatTransferComponent } from './simulations/heat-transfer/heat-transfer.component';
import { FrictionAndMotionComponent } from './problems/friction-and-motion/friction-and-motion.component';
import { ProblemsComponent } from './problems/problems.component';
import { CarsComponent } from './cars/cars.component';
import { DataGenComponent } from './educational/data-gen/data-gen.component';
import { MazesComponent } from './emulations/mazes/mazes.component';
import { SelfDriveComponent } from './emulations/self-drive/self-drive.component';
import { SigFigPipePipe } from './sig-fig-pipe.pipe';

const appRoutes: Routes = [
    { path: 'feedback', component: DisplayAllFeedbackComponent },
    { path: 'cars', component: SelfDriveComponent },
    { path: 'mazes', component: MazesComponent },
    { path: 'datagen', component: DataGenComponent },
    { path: 'problems', component: ProblemsComponent, children: [
        { path: '', redirectTo: '/search/Problem', pathMatch: 'full'},
        { path: 'friction-and-motion', component: FrictionAndMotionComponent}
    ]},
    { path: 'questions-generator', component: QuestionsGeneratorComponent, children: [
        { path: '', redirectTo: '/search/Questions', pathMatch: 'full'},
        { path: 'ideal-gasses', component: IdealGassesComponent},
        { path: 'projectile-motion', component: ProjectileMotionComponent},
        { path: 'speed-distance-time', component: SpeedDistanceTimeComponent}
    ]},
    { path: 'simulations', component: SimulationsComponent, children: [
      { path: '', redirectTo: '/search/Simulations', pathMatch: 'full'},
      { path: 'motion-ramp', component: MotionRampComponent},
      { path: 'forces-basic', component: ForcesBasicComponent},
      { path: 'freefall', component: FreefallComponent},
      { path: 'electromagnetic-fields', component: ElectromagneticFieldsComponent},
      { path: 'kinematics', component: KinematicsComponent},
      { path: 'halflife', component: HalflifeComponent},
      { path: 'momentum', component: MomentumComponent},
      { path: 'circular-motion', component: CircularMotionComponent},
      { path: 'gravity', component: GravityComponent},
      { path: 'heat-transfer', component: HeatTransferComponent}
   ]},
    { path: 'display-all-feedback', component: DisplayAllFeedbackComponent},
    { path: 'search/:searchTags', component: SearchComponent}
]

@NgModule({
  declarations: [
    AppComponent,
    QuestionsGeneratorComponent,
    SpeedDistanceTimeComponent,
    GradeConversion,
    LoginComponent,
    ProjectileMotionComponent,
    IdealGassesComponent,
    DisplayAllFeedbackComponent,
    MotionRampComponent,
    DataDisplayComponent,
    SimulationsComponent,
    FreefallComponent,
    ElectromagneticFieldsComponent,
    ForcesBasicComponent,
    KinematicsComponent,
    SimLabsComponent,
    HalflifeComponent,
    MomentumComponent,
    SearchComponent,
    CircularMotionComponent,
    GravityComponent,
    HeatTransferComponent,
    FrictionAndMotionComponent,
    ProblemsComponent, CarsComponent, DataGenComponent, MazesComponent, SelfDriveComponent, SigFigPipePipe
   ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes, { useHash: true, relativeLinkResolution: 'legacy' }),
    MathjaxModule.forRoot(),

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
