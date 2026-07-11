import { Component } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgClass, NgIf} from '@angular/common';
import {map, Observable} from 'rxjs';
import {SharedService} from '../shared';
import {ApiService} from '../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    FormsModule,
    RouterLink,
    NgIf,
    NgClass
  ]
})
export class LoginComponent {
  userEmail = '';
  password = '';

  constructor(private router: Router,
              private http:HttpClient,
              protected sharedService:SharedService,
              private api: ApiService) {}

  login() {
    const payload = {
      email:this.userEmail,
      password:this.password,
    }
    // 假设登录验证成功
    this.http.post(this.api.apiUrl('/user/login'), payload).subscribe({
      next: (response:any)=>{
        if(response.code == 200){
          this.sharedService.isLoggedIn = true;
          // 获取全局用户名
          this.sharedService.username = response.data.name;
          this.sharedService.userId = response.data.id;
          this.router.navigate(['/user_center']);
        }else{
          alert('登录失败：' + response.message);
        }
      },
      error: err => alert('登录失败：' + err.message)
    });
  }
}
