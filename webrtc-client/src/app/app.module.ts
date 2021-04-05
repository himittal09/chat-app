import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UserListComponent } from './shared/component/user-list/user-list.component';
import { UserChatComponent } from './shared/component/user-chat/user-chat.component';
import { LoginComponent } from './shared/component/login/login.component';
import { ChatViewComponent } from './shared/component/chat-view/chat-view.component';
import { RegisterComponent } from './shared/component/register/register.component';
import { CallComponent } from './shared/component/call/call.component';

import { LayoutModule } from '@angular/cdk/layout';

@NgModule({
  declarations: [
    AppComponent,
    UserListComponent,
    UserChatComponent,
    LoginComponent,
    ChatViewComponent,
    RegisterComponent,
    CallComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    LayoutModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
