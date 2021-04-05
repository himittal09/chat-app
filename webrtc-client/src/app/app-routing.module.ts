import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CallComponent } from './shared/component/call/call.component';
import { ChatViewComponent } from './shared/component/chat-view/chat-view.component';
import { LoginComponent } from './shared/component/login/login.component';
import { RegisterComponent } from './shared/component/register/register.component';
import { UserChatComponent } from './shared/component/user-chat/user-chat.component';
import { AuthGuard } from './shared/guard/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'call',
    component: CallComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '',
    component: ChatViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'chat',
    component: UserChatComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
