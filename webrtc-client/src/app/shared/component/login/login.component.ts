import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SharedService } from '../../service/shared.service';
import { User } from '../../class/User';

@Component({
  selector: 'web-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  tyringLoggingIn: boolean = false;

  constructor (private service: SharedService, private router: Router) { }

  ngOnInit(): void {
  }

  async onSubmit (e: any)
  {
    const user: User = e.value;
    try {
      this.tyringLoggingIn = true;
      await this.service.loginUser(user, 'login');
      this.router.navigate(['/']);
    } catch (error) {
      console.log(error);
    } finally {
      this.tyringLoggingIn = false;
    }
  }

}
