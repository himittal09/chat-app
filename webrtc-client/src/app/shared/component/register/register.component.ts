import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { User } from '../../class/User';
import { SharedService } from '../../service/shared.service';

@Component({
  selector: 'web-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  tryingLoggingIn: boolean = false;

  constructor(private service: SharedService, private router: Router) { }

  ngOnInit(): void {
  }

  async onSubmit (e: any)
  {
    const user: User = e.value;
    this.tryingLoggingIn = true;
    try {
      await this.service.loginUser(user, 'register');
      this.router.navigate(['/']);
    } catch (error) {
      console.log(error);
    } finally {
      this.tryingLoggingIn = false;
    }
  }

}
