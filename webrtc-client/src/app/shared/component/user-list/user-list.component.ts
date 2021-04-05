import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../class/User';
import { SharedService } from '../../service/shared.service';

@Component({
  selector: 'web-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {

  isSmallScreen: boolean;

  constructor(private service: SharedService, private breakpointObserver: BreakpointObserver,private router: Router) {
    this.isSmallScreen = this.breakpointObserver.isMatched(Breakpoints.HandsetPortrait);
  }

  ngOnInit(): void {
  }

  get userList (): User[]
  {
    return this.service.userList;
  }

  selectUser (user: User)
  {
    this.service.selectedUser = user;
    if (this.isSmallScreen)
    {
      this.router.navigate(['/chat']);
    }
  }

}
