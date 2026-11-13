package com.khanza.test;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.content.SharedPreferences;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
public final class MainActivity extends Activity {
 private int count; private TextView number; private SharedPreferences prefs;
 private final int bg=Color.rgb(12,17,29), ink=Color.rgb(239,244,255), muted=Color.rgb(151,166,191);
 private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
 private GradientDrawable shape(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
 private TextView text(String s,int size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setGravity(Gravity.CENTER);return t;}
 private void gap(LinearLayout l,int h){l.addView(new View(this),new LinearLayout.LayoutParams(1,dp(h)));}
 private Button button(String s,int color){Button b=new Button(this);b.setText(s);b.setTextSize(18);b.setTextColor(ink);b.setAllCaps(false);b.setBackground(shape(color,18));return b;}
 private void save(){number.setText(String.valueOf(count));prefs.edit().putInt("count",count).apply();}
 @Override public void onCreate(Bundle state){super.onCreate(state);
 prefs=getSharedPreferences("counter",MODE_PRIVATE);count=prefs.getInt("count",0);
 getWindow().setStatusBarColor(bg);getWindow().setNavigationBarColor(bg);
 LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setGravity(Gravity.CENTER);root.setPadding(dp(26),dp(24),dp(26),dp(24));root.setBackgroundColor(bg);
 ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(bg);scroll.addView(root);setContentView(scroll);
 TextView badge=text("KHANZA / ANDROID TEST",12,Color.rgb(91,222,183));badge.setLetterSpacing(.15f);root.addView(badge);
 gap(root,20);TextView title=text("Работает, брат.",32,ink);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);root.addView(title);
 gap(root,12);root.addView(text("Приложение установлено.\nТеперь проверим кнопки.",16,muted));
 gap(root,30);LinearLayout card=new LinearLayout(this);card.setOrientation(1);card.setGravity(Gravity.CENTER);card.setPadding(dp(20),dp(22),dp(20),dp(24));card.setBackground(shape(Color.rgb(23,33,51),26));root.addView(card,new LinearLayout.LayoutParams(-1,-2));
 card.addView(text("ТВОЙ СЧЁТЧИК",12,muted));number=text("",76,ink);number.setTypeface(Typeface.DEFAULT,Typeface.BOLD);card.addView(number);
 LinearLayout row=new LinearLayout(this);Button minus=button("−",Color.rgb(44,58,79));Button plus=button("+",Color.rgb(22,131,104));
 LinearLayout.LayoutParams left=new LinearLayout.LayoutParams(0,dp(60),1);left.setMargins(0,0,dp(8),0);row.addView(minus,left);
 LinearLayout.LayoutParams right=new LinearLayout.LayoutParams(0,dp(60),1);right.setMargins(dp(8),0,0,0);row.addView(plus,right);card.addView(row,new LinearLayout.LayoutParams(-1,-2));
 minus.setOnClickListener(new View.OnClickListener(){public void onClick(View v){if(count>Integer.MIN_VALUE)count--;save();}});plus.setOnClickListener(new View.OnClickListener(){public void onClick(View v){if(count<Integer.MAX_VALUE)count++;save();}});
 gap(root,18);Button reset=button("Сбросить",Color.rgb(31,43,63));root.addView(reset,new LinearLayout.LayoutParams(-1,dp(54)));reset.setOnClickListener(new View.OnClickListener(){public void onClick(View v){count=0;save();Toast.makeText(MainActivity.this,"Счётчик сброшен",Toast.LENGTH_SHORT).show();}});
 gap(root,24);root.addView(text("Закрой и открой приложение:\nчисло сохранится.",14,muted));gap(root,18);root.addView(text("Версия 1.0 • Без интернета",12,muted));save();
 }
}
