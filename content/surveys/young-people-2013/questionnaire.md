# Introduction

In 2013, students of the Statistics class at [FSEV
UK](https://fses.uniba.sk/en/) were asked to invite their friends to
participate in this survey.

* The data file (`responses.csv`) consists of 1010 rows and 150 columns (139
integer and 11 categorical).
* For convenience, the original variable names were shortened in the
data file. See the `columns.csv` file if you want to match the data with the original names.
* The data contain missing values.
* The survey was presented to participants in both electronic and written form.
* The original questionnaire was in Slovak language and was later translated
into English.
* All participants were of Slovakian nationality, aged between 15-30.

The variables can be split into the following groups:

* **Music preferences** (19 items)
* **Movie preferences** (12 items)
* **Hobbies & interests** (32 items)
* **Phobias** (10 items)
* **Health habits** (3 items)
* **Personality traits, views on life, & opinions** (57 items)
* **Spending habits** (7 items)
* **Demographics** (10 items)

# Research questions

Many different techniques can be used to answer many questions, e.g.

* **Clustering:** Given the music preferences, do people make up
any clusters of similar behavior?
* **Hypothesis testing:** Do women fear certain phenomena
significantly more than men? Do the left handed people have different
interests than right handed?
* **Predictive modeling:** Can we predict spending habits of a person
from his/her interests and movie or music preferences?
* **Dimension reduction:** Can we describe a large number of human
interests by a smaller number of latent concepts?
* **Correlation analysis:** Are there any connections between music and
movie preferences?
* **Visualization:** How to effectively visualize a lot of variables
in order to gain some meaningful insights from the data?
* **(Multivariate) Outlier detection:** Small number of participants often cheats and randomly answers the questions. Can you identify them? Hint: [Local outlier factor][1] may help.
* **Missing values analysis:** Are there any patterns in missing responses? What is the optimal way of imputing the values in surveys?
* **Recommendations:** If some of user's interests are known, can we predict the other? Or, if we know what a person listen, can we predict which kind of movies he/she might like?

# Past research

* (in slovak) Sleziak, P. - Sabo, M.: Gender differences in the prevalence of specific phobias. Forum Statisticum Slovacum. 2014, Vol. 10, No. 6. [Differences (gender + whether people lived in village/town) in the prevalence of phobias.] 

* Sabo, Miroslav. Multivariate Statistical Methods with Applications. Diss. Slovak University of Technology in Bratislava, 2014. [Clustering of variables (music preferences, movie preferences, phobias) + Clustering of people w.r.t. their interests.]

# Questionnaire

### MUSIC PREFERENCES
    
1. **I enjoy listening to music.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
2. **I prefer.**: Slow paced music 1-2-3-4-5 Fast paced music (integer)
3. **Dance, Disco, Funk**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
4. **Folk music**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
5. **Country**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
6. **Classical**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
7. **Musicals**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
8. **Pop**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
9. **Rock**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
10. **Metal, Hard rock**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
11. **Punk**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
12. **Hip hop, Rap**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
13. **Reggae, Ska**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
14. **Swing, Jazz**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
15. **Rock n Roll**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
16. **Alternative music**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
17. **Latin**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
18. **Techno, Trance**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
19. **Opera**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)

### MOVIE PREFERENCES

20. **I really enjoy watching movies.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
21. **Horror movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
22. **Thriller movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
23. **Comedies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
24. **Romantic movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
25. **Sci-fi movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
26. **War movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
27. **Tales**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
28. **Cartoons**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
29. **Documentaries**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
30. **Western movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)
31. **Action movies**: Don't enjoy at all 1-2-3-4-5 Enjoy very much (integer)

### HOBBIES & INTERESTS

32. **History**: Not interested 1-2-3-4-5 Very interested (integer)
33. **Psychology**: Not interested 1-2-3-4-5 Very interested (integer)
34. **Politics**: Not interested 1-2-3-4-5 Very interested (integer)
35. **Mathematics**: Not interested 1-2-3-4-5 Very interested (integer)
36. **Physics**: Not interested 1-2-3-4-5 Very interested (integer)
37. **Internet**: Not interested 1-2-3-4-5 Very interested (integer)
38. **PC Software, Hardware**: Not interested 1-2-3-4-5 Very interested (integer)
39. **Economy, Management**: Not interested 1-2-3-4-5 Very interested (integer)
40. **Biology**: Not interested 1-2-3-4-5 Very interested (integer)
41. **Chemistry**: Not interested 1-2-3-4-5 Very interested (integer)
42. **Poetry reading**: Not interested 1-2-3-4-5 Very interested (integer)
43. **Geography**: Not interested 1-2-3-4-5 Very interested (integer)
44. **Foreign languages**: Not interested 1-2-3-4-5 Very interested (integer)
45. **Medicine**: Not interested 1-2-3-4-5 Very interested (integer)
46. **Law**: Not interested 1-2-3-4-5 Very interested (integer)
47. **Cars**: Not interested 1-2-3-4-5 Very interested (integer)
48. **Art**: Not interested 1-2-3-4-5 Very interested (integer)
49. **Religion**: Not interested 1-2-3-4-5 Very interested (integer)
50. **Outdoor activities**: Not interested 1-2-3-4-5 Very interested (integer)
51. **Dancing**: Not interested 1-2-3-4-5 Very interested (integer)
52. **Playing musical instruments**: Not interested 1-2-3-4-5 Very interested (integer)
53. **Poetry writing**: Not interested 1-2-3-4-5 Very interested (integer)
54. **Sport and leisure activities**: Not interested 1-2-3-4-5 Very interested (integer)
55. **Sport at competitive level**: Not interested 1-2-3-4-5 Very interested (integer)
56. **Gardening**: Not interested 1-2-3-4-5 Very interested (integer)
57. **Celebrity lifestyle**: Not interested 1-2-3-4-5 Very interested (integer)
58. **Shopping**: Not interested 1-2-3-4-5 Very interested (integer)
59. **Science and technology**: Not interested 1-2-3-4-5 Very interested (integer)
60. **Theatre**: Not interested 1-2-3-4-5 Very interested (integer)
61. **Socializing**: Not interested 1-2-3-4-5 Very interested (integer)
62. **Adrenaline sports**: Not interested 1-2-3-4-5 Very interested (integer)
63. **Pets**: Not interested 1-2-3-4-5 Very interested (integer)

### PHOBIAS

64. **Flying**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
65. **Thunder, lightning**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
66. **Darkness**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
67. **Heights**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
68. **Spiders**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
69. **Snakes**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
70. **Rats, mice**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
71. **Ageing**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
72. **Dangerous dogs**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)
73. **Public speaking**: Not afraid at all 1-2-3-4-5 Very afraid of (integer)

### HEALTH HABITS

74. **Smoking habits**: Never smoked - Tried smoking - Former smoker - Current smoker (categorical)
75. **Drinking**: Never - Social drinker - Drink a lot (categorical)
76. **I live a very healthy lifestyle.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)

### PERSONALITY TRAITS, VIEWS ON LIFE & OPINIONS

77. **I take notice of what goes on around me.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
78. **I try to do tasks as soon as possible and not leave them until last minute.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
79. **I always make a list so I don't forget anything.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
80. **I often study or work even in my spare time.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
81. **I look at things from all different angles before I go ahead.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
82. **I believe that bad people will suffer one day and good people will be rewarded.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
83. **I am reliable at work and always complete all tasks given to me.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
84. **I always keep my promises.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
85. **I can fall for someone very quickly and then completely lose interest.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
86. **I would rather have lots of friends than lots of money.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
87. **I always try to be the funniest one.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
88. **I can be two faced sometimes.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
89. **I damaged things in the past when angry.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
90. **I take my time to make decisions.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
91. **I always try to vote in elections.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
92. **I often think about and regret the decisions I make.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
93. **I can tell if people listen to me or not when I talk to them.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
94. **I am a hypochondriac.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
95. **I am emphatetic person.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
96. **I eat because I have to. I don't enjoy food and eat as fast as I can.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
97. **I try to give as much as I can to other people at Christmas.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
98. **I don't like seeing animals suffering.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
99. **I look after things I have borrowed from others.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
100. **I feel lonely in life.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
101. **I used to cheat at school.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
102. **I worry about my health.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
103. **I wish I could change the past because of the things I have done.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
104. **I believe in God.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
105. **I always have good dreams.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
106. **I always give to charity.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
107. **I have lots of friends.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
108. **Timekeeping.**: I am often early. - I am always on time. - I am often running late. (categorical)
109. **Do you lie to others?**: Never. - Only to avoid hurting someone. - Sometimes. - Everytime it suits me. (categorical)
110. **I am very patient.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
111. **I can quickly adapt to a new environment.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
112. **My moods change quickly.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
113. **I am well mannered and I look after my appearance.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
114. **I enjoy meeting new people.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
115. **I always let other people know about my achievements.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
116. **I think carefully before answering any important letters.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
117. **I enjoy childrens' company.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
118. **I am not afraid to give my opinion if I feel strongly about something.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
119. **I can get angry very easily.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
120. **I always make sure I connect with the right people.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
121. **I have to be well prepared before public speaking.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
122. **I will find a fault in myself if people don't like me.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
123. **I cry when I feel down or things don't go the right way.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
124. **I am 100% happy with my life.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
125. **I am always full of life and energy.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
126. **I prefer big dangerous dogs to smaller, calmer dogs.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
127. **I believe all my personality traits are positive.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
128. **If I find something the doesn't belong to me I will hand it in.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
129. **I find it very difficult to get up in the morning.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
130. **I have many different hobbies and interests.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
131. **I always listen to my parents' advice.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
132. **I enjoy taking part in surveys.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
133. **How much time do you spend online?**: No time at all - Less than an hour a day - Few hours a day - Most of the day (categorical)

### SPENDING HABITS

134. **I save all the money I can.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
135. **I enjoy going to large shopping centres.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
136. **I prefer branded clothing to non branded.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
137. **I spend a lot of money on  partying and socializing.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
138. **I spend a lot of money on my appearance.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
139. **I spend a lot of money on gadgets.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)
140. **I will hapilly pay more money for good, quality or healthy food.**: Strongly disagree 1-2-3-4-5 Strongly agree (integer)

### DEMOGRAPHICS

141. **Age**:  (integer)
142. **Height**:  (integer)
143. **Weight**:  (integer)
144. **How many siblings do you have?**:  (integer)
145. **Gender**: Female - Male (categorical)
146. **I am**: Left handed - Right handed (categorical)
147. **Highest education achieved**: Currently a Primary school pupil - Primary school - Secondary school - College/Bachelor degree (categorical)
148. **I am the only child**: No - Yes (categorical)
149. **I spent most of my childhood in a**: City - village (categorical)
150. **I lived most of my childhood in a**: house/bungalow - block of flats (categorical)


  [1]: https://en.wikipedia.org/wiki/Local_outlier_factor